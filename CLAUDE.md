# Officer Validation Dashboard - Technical Documentation

**Last Updated:** 2026-02-05
**Status:** MVP Complete (Phases 1-5) + Incident Data Enrichment
**Framework:** Next.js 14+ (App Router) with TypeScript

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [React Query Hooks](#react-query-hooks)
8. [Components](#components)
9. [Common Issues & Solutions](#common-issues--solutions)
10. [Development Workflow](#development-workflow)
11. [Debugging Guide](#debugging-guide)

---

## Project Overview

A real-time, multi-validator dashboard for validating officer matches from POST (Peace Officer Standards and Training) records. Validators are automatically assigned one officer at a time, preventing duplicate work across a distributed team.

### Core Workflow
1. System assigns next available officer to validator (atomic claiming)
2. Validator reviews matched officer vs other officers with same name
3. Validator examines citations (quotes, agency names, dates) to verify match
4. Validator makes decision (Correct/Reject/Needs Review)
5. System releases officer and makes next one available

### Key Features
- **Atomic officer claiming**: Row-level locking prevents race conditions
- **Real-time updates**: Stats poll every 30s, queue polls every 10s
- **URL state management**: Deep-linkable officer reviews
- **Dark theme UI**: Custom SCSS modules with design system
- **Type-safe**: Full TypeScript coverage with no `any` types

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Dashboard Page                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ProgressStats │  │ QueueStatus  │  │OfficerDetail │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │ │
│  │         │                  │                  │          │ │
│  └─────────┼──────────────────┼──────────────────┼─────────┘ │
│            │                  │                  │            │
│  ┌─────────▼──────────────────▼──────────────────▼─────────┐ │
│  │              React Query Hooks Layer                     │ │
│  │  useValidationStats | useQueueStatus | useOfficerDetail │ │
│  │  useClaimOfficer | useValidateOfficer | useReleaseOff.. │ │
│  └─────────┬──────────────────┬──────────────────┬─────────┘ │
└────────────┼──────────────────┼──────────────────┼───────────┘
             │                  │                  │
             │  HTTP Requests   │                  │
             │                  │                  │
┌────────────▼──────────────────▼──────────────────▼───────────┐
│                    Next.js API Routes                         │
│  /api/officers/stats | /api/officers/queue                   │
│  /api/officers/claim | /api/officers/validate                │
│  /api/officers/release                                        │
└────────────┬──────────────────┬──────────────────┬───────────┘
             │                  │                  │
             │  SQL Queries     │                  │
             │                  │                  │
┌────────────▼──────────────────▼──────────────────▼───────────┐
│                    Supabase PostgreSQL                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  officer_validations table                             │  │
│  │  - id (uuid)                                           │  │
│  │  - mention_uid (text, unique)                          │  │
│  │  - data (jsonb) - all officer data                     │  │
│  │  - being_reviewed_by (text) - validator lock           │  │
│  │  - being_reviewed_at (timestamp) - lock timestamp      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  claim_next_officer(validator_id) - SQL function       │  │
│  │  Uses FOR UPDATE SKIP LOCKED for atomic claiming       │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

**Claiming an Officer:**
```
User clicks "Get Next Officer"
  ↓
useClaimOfficer() mutation
  ↓
POST /api/officers/claim
  ↓
claim_next_officer(validator_id) SQL function
  ↓
Row-level lock with FOR UPDATE SKIP LOCKED
  ↓
Update: being_reviewed_by = validator_id, status = 'being_reviewed'
  ↓
Return officer to frontend
  ↓
React Query: setQueryData(['officerDetail', mention_uid], officer)
  ↓
URL updates: ?officer={mention_uid}
  ↓
OfficerDetail renders with data from cache
  ↓
Stats and queue invalidated, refetch automatically
```

**Validating an Officer:**
```
User clicks Confirm/Reject/Needs Review
  ↓
Confirmation dialog
  ↓
useValidateOfficer() mutation
  ↓
POST /api/officers/validate
  ↓
Update officer_validations:
  - data->validation->status = 'correct'|'incorrect'|'needs_review'
  - being_reviewed_by = NULL (release lock)
  - being_reviewed_at = NULL
  ↓
React Query: invalidate all queries
  ↓
URL clears: router.push('/dashboard')
  ↓
Toast notification
  ↓
Stats and queue auto-refresh
```

---

## Tech Stack

### Core
- **Next.js 16.1.2** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety
- **Supabase** - PostgreSQL database with JavaScript client
- **TanStack Query (React Query)** - Server state management

### Styling
- **SCSS Modules** - Component-scoped styling
- **CSS Variables** - Dark theme design system
- **Tailwind CSS** - Only for shadcn/ui components

### UI Components
- **shadcn/ui** - Accessible component primitives
- **Lucide React** - Icon library
- **Sonner** - Toast notifications

### Utilities
- **date-fns** - Date formatting
- **react-hook-form** - Form handling

---

## Project Structure

```
post-validation/
├── app/
│   ├── layout.tsx              # Root layout with Providers and Toaster
│   ├── page.tsx                # Root page (redirects to /dashboard)
│   ├── globals.css             # Tailwind CSS (for shadcn only)
│   ├── variables.scss          # Dark theme CSS variables (40+ vars)
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard wrapper with Suspense
│   │   ├── DashboardContent.tsx # Main dashboard client component
│   │   └── page.module.scss    # Dashboard-specific styles
│   └── api/officers/
│       ├── claim/route.ts      # POST - Claim next officer
│       ├── validate/route.ts   # POST - Validate officer
│       ├── release/route.ts    # POST - Release officer
│       ├── stats/route.ts      # GET - Validation statistics
│       └── queue/route.ts      # GET - Queue status
│
├── components/
│   ├── index.ts                # Barrel exports
│   ├── DashboardLayout.tsx + .module.scss
│   ├── ProgressStats.tsx + .module.scss
│   ├── QueueStatus.tsx + .module.scss
│   ├── OfficerDetail.tsx + .module.scss
│   └── CitationCard.tsx + .module.scss
│
├── hooks/
│   ├── index.ts                # Barrel exports
│   ├── useClaimOfficer.ts      # Mutation: Claim officer
│   ├── useValidateOfficer.ts   # Mutation: Validate officer
│   ├── useReleaseOfficer.ts    # Mutation: Release officer
│   ├── useOfficerDetail.ts     # Query: Get officer from cache
│   ├── useValidationStats.ts   # Query: Stats (30s polling)
│   └── useQueueStatus.ts       # Query: Queue (10s polling)
│
├── lib/
│   ├── supabase.ts             # Supabase client configuration
│   ├── types.ts                # TypeScript type definitions
│   ├── providers.tsx           # React Query provider wrapper
│   └── utils.ts                # shadcn utilities
│
├── supabase/
│   └── migrations/
│       └── 002_create_claim_function.sql  # SQL function for atomic claiming
│
├── scripts/
│   ├── test-api-endpoints.js   # API endpoint test suite
│   ├── check-sql-function.js   # Verify SQL function exists
│   └── apply-migration.js      # Migration helper
│
├── todo/
│   ├── phase-1-*.md            # Phase 1 documentation
│   ├── phase-2-*.md            # Phase 2 documentation
│   ├── phase-3-*.md            # Phase 3 documentation
│   ├── phase-4-*.md            # Phase 4 documentation
│   └── phase-5-*.md            # Phase 5 documentation
│
└── plans/
    └── 2026-01-17-officer-validation-simplified.md  # Master plan
```

---

## Database Schema

### Table: `officer_validations`

```sql
CREATE TABLE officer_validations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Unique identifier for each officer mention
  mention_uid TEXT UNIQUE NOT NULL,

  -- Officer name from case
  provisional_case_name TEXT NOT NULL,

  -- All officer data stored as JSONB
  data JSONB NOT NULL,

  -- Lock fields for atomic assignment
  being_reviewed_by TEXT,           -- validator_id who claimed this
  being_reviewed_at TIMESTAMPTZ,    -- when lock was acquired

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mention_uid ON officer_validations(mention_uid);
CREATE INDEX idx_case_name ON officer_validations(provisional_case_name);
CREATE INDEX idx_validation_status ON officer_validations((data->'validation'->>'status'));
CREATE INDEX idx_being_reviewed ON officer_validations(being_reviewed_by, being_reviewed_at);
CREATE INDEX idx_stale_locks ON officer_validations(being_reviewed_at)
WHERE being_reviewed_at IS NOT NULL;
```

### JSONB Structure (`data` column)

```typescript
{
  officer_info: {
    mention_uid: string,
    provisional_case_name: string,
    document_link?: string,
    matched_post_id: string,          // e.g., "B05-C48"
    match_probability: number,        // 0.0 - 1.0
    first_name: string,
    middle_name?: string,
    last_name: string,
    matched_agency: string,
    mentioned_agencies?: string,
    total_employment_stints: number,
    other_officers_summary?: string   // e.g., "1 unique officer(s), 2 total record(s)"
  },
  matched_officer_employment_history: [
    {
      post_person_nbr: string,        // POST ID or officer identifier
      post_first_name: string,
      post_middle_name?: string,
      post_last_name: string,
      post_suffix?: string | null,
      post_agency_name: string,
      post_agency_type?: string,      // e.g., "AgencyType.POLICE"
      post_start_date: string,        // ISO timestamp or formatted date
      post_end_date?: string | null,
      post_separation_reason?: string | null,
      state?: string,                 // e.g., "CA"
      county?: string                 // e.g., "Contra Costa County"
    }
  ],
  other_officers_with_same_name: [
    {
      post_person_nbr: string,
      post_first_name: string,
      post_middle_name?: string,
      post_last_name: string,
      post_agency_name: string,
      post_start_date: string,
      post_end_date?: string | null
    }
  ],
  citations: [
    {
      file_name: string,
      file_id: string,               // SHA1 hash
      page_number: number,
      quote: string,
      validator_reasoning?: string,  // Why this citation supports the match
      agency_name: string,
      blob_url: string               // Azure Blob Storage URL with SAS token
    }
  ],
  citation_count: number,

  // Incident date information (enriched data)
  csv_incident_date: string | null,  // ISO date format (YYYY-MM-DD)
  csv_incident_year: string | null,
  csv_incident_month: string | null,
  csv_incident_day: string | null,

  // Incident date citations (different from employment citations above)
  csv_citations: [
    {
      filename: string,
      sha1: string,                  // File hash
      gdrive_id: string,             // Google Drive file ID
      gdrive_url: string,            // Google Drive URL
      page_number: number,
      quote: string,                 // Text evidence of incident date
      validator_reasoning: string    // Why this citation supports the incident date
    }
  ] | null,

  csv_blob_urls: string | null,      // Additional blob storage URLs for incident
  csv_enriched_at: string | null,    // ISO timestamp when enrichment was added

  validation: {
    status: 'pending' | 'being_reviewed' | 'correct' | 'incorrect' | 'needs_review',
    validated_by: string | null,
    validated_at: string | null,     // ISO timestamp
    notes: string | null
  },

  // Additional metadata
  success?: boolean,
  error?: string | null
}
```

**Key Field Distinctions:**
- `citations` - Citations supporting the **officer employment match** (agency citations)
- `csv_citations` - Citations supporting the **incident date** (date citations, will be rendered on front-end)
- `csv_incident_date` - The parsed incident date in ISO format (YYYY-MM-DD)
- `csv_blob_urls` - Additional blob storage URLs specifically for incident-related documents

### SQL Function: `claim_next_officer`

Located in: `supabase/migrations/002_create_claim_function.sql`

```sql
CREATE OR REPLACE FUNCTION claim_next_officer(validator_id TEXT)
RETURNS officer_validations AS $$
DECLARE
  officer officer_validations;
BEGIN
  -- Find and lock next available officer
  SELECT * INTO officer
  FROM officer_validations
  WHERE data->'validation'->>'status' = 'pending'
    AND being_reviewed_by IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;  -- KEY: Prevents race conditions

  -- If found, claim it
  IF officer.id IS NOT NULL THEN
    UPDATE officer_validations
    SET
      being_reviewed_by = validator_id,
      being_reviewed_at = NOW(),
      data = jsonb_set(data, '{validation,status}', '"being_reviewed"'),
      updated_at = NOW()
    WHERE id = officer.id;

    -- Return updated officer
    SELECT * INTO officer FROM officer_validations WHERE id = officer.id;
  END IF;

  RETURN officer;
END;
$$ LANGUAGE plpgsql;
```

**Why `FOR UPDATE SKIP LOCKED`?**
- Prevents race conditions when multiple validators claim simultaneously
- If row is locked by another transaction, skip it and try next
- Ensures atomic, conflict-free claiming

---

## API Endpoints

All endpoints are in `app/api/officers/*/route.ts`

### POST `/api/officers/claim`

**Purpose:** Atomically claim the next available officer for a validator

**Request Body:**
```json
{
  "validatorId": "validator_001"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "officer": {
    "id": "uuid",
    "mention_uid": "officer_123",
    "data": { /* full JSONB structure */ },
    "being_reviewed_by": "validator_001",
    "being_reviewed_at": "2026-01-17T10:00:00Z"
  }
}
```

**Response (No Officers - 200):**
```json
{
  "success": true,
  "officer": null,
  "message": "No officers available for review"
}
```

**Error (400):**
```json
{
  "error": "Validator ID is required"
}
```

**Implementation Note:**
- Calls `claim_next_officer(validator_id)` SQL function
- Uses database transaction for atomicity
- Returns `null` if no officers available

---

### POST `/api/officers/validate`

**Purpose:** Validate an officer and release the lock

**Request Body:**
```json
{
  "mentionUid": "officer_123",
  "validatorId": "validator_001",
  "status": "correct",  // "correct" | "incorrect" | "needs_review"
  "notes": "Employment dates match citations perfectly"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "officer": {
    "mention_uid": "officer_123",
    "data": {
      "validation": {
        "status": "correct",
        "validated_by": "validator_001",
        "validated_at": "2026-01-17T10:30:00Z",
        "notes": "Employment dates match citations perfectly"
      }
    }
  }
}
```

**Errors:**
- **400:** Missing required fields
- **404:** Officer not found
- **409:** Officer not owned by this validator (someone else claimed it)

**Implementation Note:**
- Updates `data->validation` JSONB path
- Clears lock: `being_reviewed_by = NULL`, `being_reviewed_at = NULL`
- Verifies validator owns the lock before updating

---

### POST `/api/officers/release`

**Purpose:** Release an officer without validation (abandon review)

**Request Body:**
```json
{
  "mentionUid": "officer_123",
  "validatorId": "validator_001"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Officer released successfully"
}
```

**Implementation Note:**
- Sets status back to `'pending'`
- Clears lock fields
- Officer becomes available for other validators

---

### GET `/api/officers/stats`

**Purpose:** Get aggregate validation statistics

**Response (Success - 200):**
```json
{
  "total": 72,
  "pending": 50,
  "inReview": 2,
  "validated": 20,
  "correct": 18,
  "incorrect": 1,
  "needsReview": 1,
  "successRate": 0.947
}
```

**Calculation:**
- `successRate = correct / (correct + incorrect)`
- Returns `0` if no validations yet

**Implementation Note:**
- **CRITICAL:** API returns data directly (not nested in `{ stats: {...} }`)
- Hook must use `return data` not `return data.stats`

---

### GET `/api/officers/queue?validatorId=validator_001`

**Purpose:** Get queue status and validator's current officer

**Query Params:**
- `validatorId` (required): Validator's unique ID

**Response (Success - 200):**
```json
{
  "available": 50,
  "inReview": 2,
  "yourOfficer": {
    "mention_uid": "officer_123",
    "officer_name": "MICHAEL WEBB",
    "started_at": "2026-01-17T10:00:00Z",
    "time_elapsed_minutes": 30
  }
}
```

**Response (Not Reviewing - 200):**
```json
{
  "available": 50,
  "inReview": 2,
  "yourOfficer": null
}
```

**Implementation Note:**
- **CRITICAL:** API returns data directly (not nested in `{ queueStatus: {...} }`)
- Hook must use `return data` not `return data.queueStatus`
- Calculates `time_elapsed_minutes` from `being_reviewed_at`

---

## React Query Hooks

All hooks are in `hooks/` directory with barrel export in `hooks/index.ts`

### Mutation Hooks

#### `useClaimOfficer()`

```typescript
const claimOfficer = useClaimOfficer();

claimOfficer.mutate(
  { validatorId: 'validator_001' },
  {
    onSuccess: (data) => {
      if (data.officer) {
        console.log('Claimed:', data.officer.mention_uid);
        // Officer is automatically cached in React Query
      } else {
        console.log('No officers available');
      }
    },
    onError: (error) => {
      console.error('Claim failed:', error.message);
    }
  }
);
```

**Features:**
- Calls `POST /api/officers/claim`
- On success: Invalidates `validationStats` and `queueStatus` queries
- On success: Sets officer in cache at key `['officerDetail', mention_uid]`
- Returns `ClaimOfficerResponse` type

---

#### `useValidateOfficer()`

```typescript
const validateOfficer = useValidateOfficer();

validateOfficer.mutate({
  mentionUid: 'officer_123',
  validatorId: 'validator_001',
  status: 'correct',
  notes: 'Verified'
});
```

**Features:**
- Calls `POST /api/officers/validate`
- On success: Invalidates ALL queries (stats, queue, officer detail)
- Clears officer from cache after validation
- Returns `ValidateOfficerResponse` type

---

#### `useReleaseOfficer()`

```typescript
const releaseOfficer = useReleaseOfficer();

releaseOfficer.mutate({
  mentionUid: 'officer_123',
  validatorId: 'validator_001'
});
```

**Features:**
- Calls `POST /api/officers/release`
- On success: Invalidates stats and queue queries
- Removes officer from cache
- Returns `ReleaseOfficerResponse` type

---

### Query Hooks

#### `useValidationStats()`

```typescript
const { data: stats, isLoading, error } = useValidationStats();

// stats = { total: 72, pending: 50, validated: 22, ... }
```

**Features:**
- Calls `GET /api/officers/stats`
- **Auto-polls every 30 seconds** for real-time updates
- Stale time: 25 seconds
- Returns `ValidationStats` type

**CRITICAL FIX:**
```typescript
// ✅ CORRECT (after fix)
const data = await response.json();
return data;  // API returns stats directly

// ❌ WRONG (before fix)
return data.stats;  // API doesn't nest in 'stats' key
```

---

#### `useQueueStatus(validatorId)`

```typescript
const { data: queue } = useQueueStatus('validator_001');

// queue = { available: 50, inReview: 2, yourOfficer: {...} }
```

**Features:**
- Calls `GET /api/officers/queue?validatorId=...`
- **Auto-polls every 10 seconds** (faster for timer updates)
- Stale time: 8 seconds
- Requires `validatorId` parameter
- Returns `QueueStatus` type

**CRITICAL FIX:**
```typescript
// ✅ CORRECT (after fix)
const data = await response.json();
return data;  // API returns queue status directly

// ❌ WRONG (before fix)
return data.queueStatus;  // API doesn't nest in 'queueStatus' key
```

---

#### `useOfficerDetail(mentionUid)`

```typescript
const { data: officer, isLoading } = useOfficerDetail('officer_123');

// officer = full OfficerValidation record
```

**Features:**
- Gets officer from React Query cache (set by `useClaimOfficer`)
- Does NOT make API call (uses cached data)
- Returns `OfficerValidation` type
- Only fetches if `mentionUid` is provided

---

## Components

All components use SCSS Modules for styling.

### DashboardLayout

**File:** `components/DashboardLayout.tsx`
**Purpose:** Two-column container

```typescript
<DashboardLayout>
  <div className="left-column">{/* 340px fixed */}</div>
  <div className="right-column">{/* flex: 1 */}</div>
</DashboardLayout>
```

**Layout:**
- Left: 340px fixed width
- Right: Fills remaining space
- Gap: 24px
- Full viewport height

---

### ProgressStats

**File:** `components/ProgressStats.tsx`
**Hook:** `useValidationStats()`

**Features:**
- Total officers count
- Validated count and percentage
- Progress bar (0-100%)
- Status breakdown badges:
  - Correct (green)
  - Incorrect (red)
  - Needs Review (blue)
- Success rate: `correct / (correct + incorrect)`
- Auto-refreshes every 30s

**Loading State:** Skeleton with pulsing animation

---

### QueueStatus

**File:** `components/QueueStatus.tsx`
**Hooks:** `useQueueStatus()`, `useClaimOfficer()`, `useReleaseOfficer()`

**Features:**
- Available officers count (green)
- In-review count (purple)
- Currently reviewing section:
  - Officer name
  - Time elapsed (updates every 10s)
  - Lock indicator icon
- "Get Next Officer" button (primary, teal)
  - Disabled when already reviewing
  - Shows loading spinner during claim
- "Release Current Officer" button (secondary, ghost)
  - Only visible when reviewing
  - Confirmation dialog before release

**Props:**
```typescript
interface QueueStatusProps {
  validatorId: string;
  onOfficerClaimed: (mentionUid: string) => void;
  onOfficerReleased: () => void;
}
```

---

### OfficerDetail

**File:** `components/OfficerDetail.tsx`
**Hooks:** `useOfficerDetail()`, `useValidateOfficer()`

**Sections:**

1. **Header Section:**
   - Input officer name (from case)
   - Matched officer name + POST ID
   - Match probability badge (color-coded):
     - Green: ≥85%
     - Amber: 70-84%
     - Red: <70%
   - Matched agency badge
   - Lock indicator with timestamp

2. **Employment Comparison:**
   - Left: Matched officer employment table
   - Right: Other officers with same name
   - Tables show: Agency, Start/End Date, Duration
   - Matched rows highlighted with teal tint
   - Conflict warning if multiple officers found
   - Empty state: "No conflicting officers found"

3. **Citations Section:**
   - List of `CitationCard` components
   - Citation count in header
   - Warning badge if no citations
   - Empty state with alert icon

4. **Validation Actions:**
   - Notes textarea (optional)
   - Three action buttons:
     - Confirm (green) with CheckCircle icon
     - Reject (red) with XCircle icon
     - Needs Review (yellow) with Eye icon
   - Confirmation dialog before submit
   - Loading state with disabled buttons

**Empty State:**
- Shown when `mentionUid` is `null`
- Message: "Click 'Get Next Officer' to begin validation"
- Centered with arrow icon

**Props:**
```typescript
interface OfficerDetailProps {
  mentionUid: string | null;
  validatorId: string;
  onValidationComplete: () => void;
}
```

**CRITICAL BUG FIXES:**
```typescript
// ✅ CORRECT (after fix)
const {
  officer_info,
  matched_officer_employment_history = [],  // default empty array
  other_officers_with_same_name = [],       // default empty array
  citations = []                            // default empty array
} = officer.data || {};

// Safety check for officer_info
if (!officer_info) {
  return <InvalidDataError />;
}

// In EmploymentTable component
{employments && employments.length > 0 ? (
  employments.map(...)
) : (
  <tr><td colSpan={4}>No employment history available</td></tr>
)}
```

---

### CitationCard

**File:** `components/CitationCard.tsx`

**Features:**
- Document quote with agency name highlighting
- File name and page number
- Agency badge (teal, uppercase)
- PDF link (opens in new tab)
- External link icon
- Left teal accent border
- Hover effect (lighter background)

**Props:**
```typescript
interface CitationCardProps {
  citation: Citation;
}
```

**Agency Highlighting:**
```typescript
// Highlights agency name in quote (case-insensitive)
const highlightedQuote = quote.replace(
  new RegExp(`(${agencyName})`, 'gi'),
  '<span class="highlighted">$1</span>'
);
```

---

## Common Issues & Solutions

### 1. React Query Returns `undefined` ❌

**Symptom:**
```
Query data cannot be undefined. Please make sure to return a value
other than undefined from your query function.
Affected query key: ["validationStats"]
```

**Cause:**
API endpoints return data directly, but hooks were trying to access nested properties.

**Solution:**
```typescript
// ❌ WRONG
const data = await response.json();
return data.stats;  // Undefined! API doesn't nest data

// ✅ CORRECT
const data = await response.json();
return data;  // API returns stats object directly
```

**Files Fixed:**
- `hooks/useValidationStats.ts` - Changed `return data.stats` to `return data`
- `hooks/useQueueStatus.ts` - Changed `return data.queueStatus` to `return data`

---

### 2. Cannot Read Properties of Undefined (Reading 'map') ❌

**Symptom:**
```
TypeError: Cannot read properties of undefined (reading 'map')
at EmploymentTable (components/OfficerDetail.tsx:327)
```

**Cause:**
Arrays from JSONB can be undefined if data is malformed or missing.

**Solution:**
```typescript
// ✅ Add default empty arrays
const {
  matched_officer_employment_history = [],
  other_officers_with_same_name = [],
  citations = []
} = officer.data || {};

// ✅ Add safety check before map
{employments && employments.length > 0 ? (
  employments.map(...)
) : (
  <EmptyState />
)}
```

**Files Fixed:**
- `components/OfficerDetail.tsx` - Added defaults and safety checks

---

### 3. CSS Modules Error: "Selector '*' is not pure" ❌

**Symptom:**
```
Transforming CSS failed
Selector "*" is not pure. Pure selectors must contain at least
one local class or id.
```

**Cause:**
SCSS modules were importing `variables.scss` which contains global selectors (`*`, `body`, `html`).

**Solution:**
```scss
// ❌ WRONG - Don't import variables.scss in module files
@import '../app/variables.scss';

// ✅ CORRECT - CSS variables are globally available
.card {
  background-color: var(--bg-primary);  // Just use them directly
}
```

Also replace SCSS variables with actual values:
```scss
// ❌ WRONG
font-family: $font-mono;

// ✅ CORRECT
font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
```

**Files Fixed:**
- Removed `@import` from all `.module.scss` files
- Replaced `$font-mono` and `$font-sans` with actual font stacks

---

### 4. useSearchParams() Requires Suspense Boundary ❌

**Symptom:**
```
useSearchParams() should be wrapped in a suspense boundary at page "/dashboard"
```

**Cause:**
`useSearchParams()` is a client-side hook that needs Suspense for SSR.

**Solution:**
```typescript
// ✅ Split into two components

// app/dashboard/page.tsx (Server Component)
export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

// app/dashboard/DashboardContent.tsx (Client Component)
'use client';
export default function DashboardContent() {
  const searchParams = useSearchParams();  // ✅ Now wrapped in Suspense
  // ...
}
```

**Files Created:**
- `app/dashboard/DashboardContent.tsx` - Client component with search params
- `app/dashboard/page.tsx` - Server component wrapper with Suspense

---

### 5. Supabase Connection Issues ⚠️

**Symptom:**
API calls return 500 errors or timeout.

**Debugging Steps:**

1. **Check environment variables:**
```bash
# Verify these exist in .env.local
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

2. **Test Supabase connection:**
```typescript
// In lib/supabase.ts
export async function testConnection() {
  const { data, error } = await supabase
    .from('officer_validations')
    .select('count')
    .limit(1);

  console.log('Connection:', error ? 'FAILED' : 'SUCCESS');
  return !error;
}
```

3. **Check table exists:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM officer_validations;
```

4. **Verify SQL function exists:**
```bash
node scripts/check-sql-function.js
```

5. **Check RLS policies:**
Ensure Row Level Security policies allow access (or disable RLS for testing):
```sql
ALTER TABLE officer_validations DISABLE ROW LEVEL SECURITY;
```

---

### 6. Officer Data Not Loading After Claim ⚠️

**Symptom:**
Officer is claimed but OfficerDetail shows empty state or loading forever.

**Debugging Steps:**

1. **Check React Query cache:**
```typescript
// In browser console
window.__REACT_QUERY_DEVTOOLS__ = true;
// Open React Query DevTools (should appear automatically)
// Look for key: ['officerDetail', 'officer_123']
```

2. **Verify officer is in cache after claim:**
```typescript
// In useClaimOfficer.ts onSuccess
console.log('Setting officer in cache:', data.officer.mention_uid);
queryClient.setQueryData(
  ['officerDetail', data.officer.mention_uid],
  data.officer
);
```

3. **Check URL parameter:**
```typescript
// In DashboardContent.tsx
console.log('Current officer UID:', searchParams.get('officer'));
```

4. **Verify officer data structure:**
```typescript
// In OfficerDetail.tsx
console.log('Officer data:', officer?.data);
console.log('Officer info:', officer?.data?.officer_info);
```

**Common Causes:**
- URL not updating after claim → Check `handleOfficerClaimed` callback
- Cache key mismatch → Ensure `mention_uid` matches between claim and detail
- Officer data missing `officer_info` → Check database JSONB structure

---

### 7. Lock Not Released After Validation ⚠️

**Symptom:**
Officer stays in "being reviewed" state after validation.

**Debugging Steps:**

1. **Check database directly:**
```sql
SELECT
  mention_uid,
  being_reviewed_by,
  being_reviewed_at,
  data->'validation'->>'status' as validation_status
FROM officer_validations
WHERE being_reviewed_by IS NOT NULL;
```

2. **Verify validate endpoint logic:**
```typescript
// In app/api/officers/validate/route.ts
// Should set both to NULL
being_reviewed_by: null,
being_reviewed_at: null,
```

3. **Check for errors during validation:**
```typescript
// Look for 409 errors (validator doesn't own lock)
validateOfficer.mutate(request, {
  onError: (error) => {
    console.error('Validation failed:', error);
  }
});
```

---

## Development Workflow

### Starting Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# 3. Verify Supabase connection
node scripts/check-sql-function.js

# 4. Start dev server
npm run dev

# 5. Open http://localhost:3000
```

### Testing Workflow

```bash
# Run TypeScript checks
npx tsc --noEmit

# Build for production
npm run build

# Test API endpoints (requires server running)
node scripts/test-api-endpoints.js

# Test in browser
# 1. Click "Get Next Officer"
# 2. Verify officer details load
# 3. Validate as Correct
# 4. Verify stats update
# 5. Repeat with Incorrect and Needs Review
```

### Committing Changes

```bash
# Check status
git status

# Stage files
git add .

# Commit with message
git commit -m "feat: implement feature X

- Detail 1
- Detail 2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to remote
git push origin main
```

---

## Debugging Guide

### React Query DevTools

Enable in browser:
```typescript
// In lib/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

**Useful Queries to Inspect:**
- `['validationStats']` - Should update every 30s
- `['queueStatus', 'validator_001']` - Should update every 10s
- `['officerDetail', 'officer_123']` - Officer data cache

### Browser Console Debugging

```javascript
// Check current officer in URL
new URLSearchParams(window.location.search).get('officer');

// Test API endpoints
fetch('/api/officers/stats').then(r => r.json()).then(console.log);

// Check React Query cache
window.__REACT_QUERY_DEVTOOLS__;
```

### Supabase Debugging

```sql
-- Check total officers
SELECT COUNT(*) FROM officer_validations;

-- Check validation status distribution
SELECT
  data->'validation'->>'status' as status,
  COUNT(*) as count
FROM officer_validations
GROUP BY status;

-- Check locked officers
SELECT
  mention_uid,
  being_reviewed_by,
  being_reviewed_at,
  NOW() - being_reviewed_at as locked_duration
FROM officer_validations
WHERE being_reviewed_by IS NOT NULL;

-- Find stale locks (>30 minutes)
SELECT
  mention_uid,
  being_reviewed_by,
  being_reviewed_at
FROM officer_validations
WHERE being_reviewed_at < NOW() - INTERVAL '30 minutes';

-- Release stale locks manually
UPDATE officer_validations
SET
  being_reviewed_by = NULL,
  being_reviewed_at = NULL,
  data = jsonb_set(data, '{validation,status}', '"pending"')
WHERE being_reviewed_at < NOW() - INTERVAL '30 minutes';
```

### Network Debugging

```bash
# Check API responses
curl http://localhost:3000/api/officers/stats | jq

# Test claim endpoint
curl -X POST http://localhost:3000/api/officers/claim \
  -H "Content-Type: application/json" \
  -d '{"validatorId":"test_user"}' | jq

# Test queue endpoint
curl "http://localhost:3000/api/officers/queue?validatorId=test_user" | jq
```

---

## Performance Considerations

### Query Polling Intervals

- **Stats:** 30s (balance between freshness and load)
- **Queue:** 10s (needs faster updates for timer)
- **Officer Detail:** No polling (static once claimed)

### React Query Cache Configuration

```typescript
// In lib/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 10 * 60 * 1000,        // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,   // Disable in dev
    },
  },
});
```

### Database Indexes

Critical indexes for performance:
```sql
-- Fast status filtering
CREATE INDEX idx_validation_status
ON officer_validations((data->'validation'->>'status'));

-- Fast lock lookups
CREATE INDEX idx_being_reviewed
ON officer_validations(being_reviewed_by, being_reviewed_at);
```

---

## Security Considerations

### Current State (MVP)
- ⚠️ Hardcoded validator ID: `"validator_001"`
- ⚠️ No authentication system
- ⚠️ No authorization checks
- ⚠️ Supabase RLS disabled (or using anon key)

### Production Requirements
1. **Add authentication:**
   - NextAuth.js or Supabase Auth
   - Secure validator sessions
   - JWT tokens

2. **Add authorization:**
   - Verify validator owns lock before validation
   - Prevent unauthorized claiming
   - Role-based access control

3. **Enable Row Level Security:**
```sql
ALTER TABLE officer_validations ENABLE ROW LEVEL SECURITY;

-- Allow validators to claim pending officers
CREATE POLICY claim_policy ON officer_validations
  FOR UPDATE USING (
    data->'validation'->>'status' = 'pending'
    AND being_reviewed_by IS NULL
  );

-- Allow validators to validate their own officers
CREATE POLICY validate_policy ON officer_validations
  FOR UPDATE USING (
    being_reviewed_by = auth.uid()
  );
```

4. **Secure environment variables:**
   - Use Vercel environment variables
   - Never commit `.env.local`
   - Rotate keys regularly

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run `npm run build` - verify builds without errors
- [ ] Run `npx tsc --noEmit` - verify no TypeScript errors
- [ ] Test all workflows (claim, validate, release)
- [ ] Verify SQL function deployed to production Supabase
- [ ] Update environment variables in Vercel
- [ ] Test with production Supabase instance

### Deployment

```bash
# Deploy to Vercel
vercel --prod

# Or push to main (if auto-deploy enabled)
git push origin main
```

### Post-Deployment

- [ ] Verify `/api/officers/stats` returns data
- [ ] Verify `/api/officers/queue` returns data
- [ ] Test claiming an officer
- [ ] Test validation workflow
- [ ] Check Supabase logs for errors
- [ ] Monitor Vercel logs for errors

---

## Future Enhancements

### Phase 6: Polish & Testing (Not Yet Implemented)
- Loading skeletons for better UX
- Smooth transitions and animations
- Keyboard shortcuts (C=confirm, R=reject, N=needs review, Enter=claim)
- Accessibility audit (WCAG AA)
- Cross-browser testing

### Phase 7: Background Jobs (Not Yet Implemented)
- Stale lock cleanup (30-minute timeout)
- Scheduled job every 5 minutes
- Monitoring and alerting

### Phase 8: Deployment (Not Yet Implemented)
- Vercel production deployment
- Environment configuration
- Staging environment

### Post-MVP Features
- Auto-fetch next officer after validation
- Undo last validation (within 5 minutes)
- Bulk export to CSV
- Advanced metrics dashboard
- Validator leaderboard
- PDF preview modal
- Officer comments/discussion thread
- Manual officer assignment
- Validator profiles and stats

---

## Key Learnings

1. **Always check API response structure:** Don't assume nesting
2. **Add default values for JSONB arrays:** Prevent `undefined.map()` errors
3. **CSS Modules don't allow global selectors:** Keep variables in global CSS
4. **Suspense boundary required for `useSearchParams()`:** Wrap in Suspense
5. **React Query cache keys must match:** Ensure consistency between mutations and queries
6. **FOR UPDATE SKIP LOCKED is crucial:** Prevents race conditions in claiming
7. **Polling intervals matter:** Balance between freshness and server load

---

## Contact & Support

**Project Repository:** (Add GitHub URL)
**Documentation:** See `todo/` directory for phase-specific docs
**API Documentation:** See `API_DOCUMENTATION.md`
**Plan:** See `plans/2026-01-17-officer-validation-simplified.md`

---

**Last Updated:** 2026-01-17
**Version:** 1.0.0-mvp
**Status:** ✅ MVP Complete (Phases 1-5)
