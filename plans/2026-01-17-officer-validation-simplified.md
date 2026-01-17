# Officer Validation Dashboard - Complete Plan v2

---

## Overview

A real-time, multi-validator dashboard for validating officer matches. Validators are automatically assigned one officer at a time, preventing duplicate work across a distributed team. Each validator reviews employment histories, checks for conflicts, and verifies matches against citation evidence.

### Core Workflow
1. System assigns next available officer to validator
2. Validator reviews matched officer vs other officers with same name
3. Validator examines citations (quotes, agency names, dates) to verify match
4. Validator makes decision (Confirm/Reject/Needs Review)
5. System releases officer and assigns next one

### Key Features
- **Real-time assignment**: Officers automatically assigned to prevent duplicate work
- **Lock mechanism**: Officers locked to validator during review (30-min timeout)
- **Multi-validator support**: Team can work simultaneously from different locations
- **Progress tracking**: Real-time stats across all validators
- **Single-officer focus**: No list scrolling, just review → validate → next

---

## Architecture

### Layout Structure

**Two-Column Dashboard**
- **Left Column (340px)**: Progress stats + queue status + navigation
- **Right Column (flex)**: Officer detail view + validation actions

### Component Strategy

**5 Components Total** (focused and minimal):

1. **DashboardLayout** - Two-column container
2. **ProgressStats** - Real-time validation metrics
3. **QueueStatus** - Available vs in-review officers
4. **OfficerDetail** - Main detail view with all sections
5. **CitationCard** - Individual citation display

Each component has its own `.module.scss` file for styling.

---

## Component Details

### 1. DashboardLayout
**Purpose**: Container for the two-column structure

**Props**: `children`

**Layout**:
```
┌─────────────┬──────────────────────────────────┐
│             │                                  │
│  Progress   │                                  │
│   Stats     │                                  │
│             │                                  │
├─────────────┤                                  │
│             │                                  │
│   Queue     │        Officer Detail            │
│   Status    │                                  │
│             │                                  │
├─────────────┤                                  │
│             │                                  │
│ Navigation  │                                  │
│  Actions    │                                  │
│             │                                  │
└─────────────┴──────────────────────────────────┘
```

### 2. ProgressStats
**Purpose**: Show real-time validation progress across all validators

**Data displayed**:
- Total officers in system
- Validated count and percentage
- Status breakdown:
  - Correct: X
  - Incorrect: Y
  - Needs Review: Z
- Success rate: correct / (correct + incorrect)
- Progress bar showing completion percentage

**Styling**: Card with dark background, colored badges for each status

**Updates**: Refreshes automatically every 30 seconds or after validation action

### 3. QueueStatus
**Purpose**: Show queue state and validator status

**Data displayed**:
- Available officers (pending, not locked)
- In review (locked by any validator)
- Your status:
  - Currently reviewing: Officer name
  - Time elapsed on current officer
- "Get Next Officer" button (prominent)
- "Release Current Officer" button (secondary, for abandoning)

**Styling**: Card below progress stats, uses accent colors for active states

**Behavior**: 
- "Get Next Officer" disabled if already reviewing an officer
- Shows loading state while claiming next officer
- Shows error if no officers available

### 4. OfficerDetail
**Purpose**: Main content area showing full officer information

**Sections** (vertically stacked):

**Header Section**:
- Input officer name (from mentions)
- Matched officer name and POST ID
- Match probability with visual indicator (color-coded)
- Matched agency
- Lock indicator: "Assigned to you at [timestamp]"

**Employment Comparison Section**:
- **Left side**: Matched Officer Employment History
  - Table with: Agency, Start Date, End Date, Duration, Separation Reason
  - Highlighted as the "matched" record
- **Right side**: Other Officers with Same Name
  - Same table structure
  - Shows all other POST records with same/similar name
  - Highlights differences (different agency, overlapping dates)
  - Warning indicator if dates overlap or names suspiciously similar
- **Empty state**: "No conflicting officers found" if other_officers_with_same_name is empty

**Citations Section**:
- List of CitationCard components
- Each citation shows evidence from documents
- Warning if no citations: "No citations found - verify manually"

**Validation Actions Section**:
- Three buttons: Confirm (green), Reject (red), Needs Review (yellow)
- Notes textarea (optional)
- Submit triggers confirmation dialog
- On submit: Updates status, releases lock, shows success toast

**Empty State**: 
- Shows when no officer assigned
- Message: "Click 'Get Next Officer' to begin validation"
- Prominent call-to-action button

### 5. CitationCard
**Purpose**: Display individual citation evidence

**Content**:
- Document quote (with agency name highlighted)
- File name
- Page number
- Agency name badge
- Link to PDF (opens in new tab with external link icon)

**Styling**: Dark card with left border accent, quote in larger text, metadata in muted color

---

## Data Flow & State Management

### Officer Assignment Flow

```
User clicks "Get Next Officer"
    ↓
claimNextOfficer() mutation called
    ↓
Database transaction:
  1. Find first officer WHERE status = 'pending'
  2. Set status = 'being_reviewed'
  3. Set being_reviewed_by = validator_id
  4. Set being_reviewed_at = NOW()
  5. Return officer (or null if none available)
    ↓
If officer found:
  - URL updates: ?officer={mention_uid}
  - OfficerDetail renders with data
  - Lock established
If no officer:
  - Show message: "No officers available for review"
    ↓
User reviews and validates
    ↓
validateOfficer() mutation called
    ↓
Database update:
  - Set status = 'correct' | 'incorrect' | 'needs_review'
  - Set validated_by = validator_id
  - Set validated_at = NOW()
  - Set being_reviewed_by = NULL
  - Set being_reviewed_at = NULL
  - Store notes
    ↓
Lock released
    ↓
Stats updated
    ↓
Auto-fetch next officer (optional) or show success message
```

### Server State (React Query)

**5 Hooks**:

1. `useClaimOfficer()` - Mutation to claim next available officer
   - POST to `/api/officers/claim`
   - Returns: Officer record or null
   - On success: Updates URL, invalidates stats

2. `useOfficerDetail(mentionUid)` - Fetches single officer
   - Returns: Full officer_validations record with JSONB data
   - Only fetches if mentionUid exists

3. `useValidationStats()` - Fetches aggregate stats
   - Returns: { total, validated, pending, inReview, correct, incorrect, needsReview, successRate }
   - Refetches every 30 seconds
   - Invalidated after any validation action

4. `useQueueStatus()` - Fetches queue state
   - Returns: { available, inReview, yourOfficer, timeElapsed }
   - Refetches every 10 seconds

5. `useValidateOfficer()` - Mutation for validation
   - Updates status, releases lock, stores notes
   - Invalidates all queries to refresh UI

### Background Jobs

**Stale Lock Cleanup** (runs every 5 minutes):
- Find officers WHERE status = 'being_reviewed' AND being_reviewed_at < NOW() - 30 minutes
- Set status = 'pending'
- Clear being_reviewed_by and being_reviewed_at
- Log abandoned locks for monitoring

### UI State (URL Parameters)

- `?officer={mention_uid}` - Currently assigned officer

**Note**: No search or filters needed since officers are auto-assigned

---

## UI/UX Design

### Dark Theme Palette

**Backgrounds**:
- `--bg-app: #0d0d0d` (application background - darkest)
- `--bg-primary: #1a1a1a` (main content areas, cards)
- `--bg-secondary: #262626` (hover states, secondary cards)
- `--bg-tertiary: #2d2d2d` (active/selected states)
- `--bg-input: #1f1f1f` (form inputs, search fields)

**Borders**:
- `--border-subtle: #2a2a2a` (card borders, dividers)
- `--border-medium: #333333` (section separators)
- `--border-focus: #404040` (focused input borders)
- `--border-active: #4a4a4a` (active/selected borders)

**Text**:
- `--text-primary: #ffffff` (headings, primary content)
- `--text-secondary: #d4d4d4` (body text, descriptions)
- `--text-muted: #a3a3a3` (metadata, timestamps, labels)
- `--text-disabled: #737373` (disabled states)
- `--text-placeholder: #666666` (input placeholders)

**Status Colors**:
- `--status-pending: #f59e0b` (amber - pending validation)
- `--status-being-reviewed: #8b5cf6` (purple - in review)
- `--status-correct: #22c55e` (green - validated correct)
- `--status-incorrect: #ef4444` (red - validated incorrect)
- `--status-review: #3b82f6` (blue - needs review)

**Priority Colors**:
- `--priority-high: #ef4444` (red)
- `--priority-medium: #f59e0b` (amber)
- `--priority-low: #6b7280` (gray)

**Match Probability Colors**:
- `--match-high: #22c55e` (green - >0.85)
- `--match-medium: #f59e0b` (amber - 0.7-0.85)
- `--match-low: #ef4444` (red - <0.7)

**Accent Colors**:
- `--accent-primary: #14b8a6` (teal - primary actions, links)
- `--accent-hover: #0d9488` (darker teal - hover states)
- `--accent-active: #0f766e` (darkest teal - active states)

**Semantic Colors**:
- `--success: #22c55e`
- `--warning: #f59e0b`
- `--error: #ef4444`
- `--info: #3b82f6`

### Component Styling

**Cards**:
- Background: `var(--bg-primary)`
- Border: `1px solid var(--border-subtle)`
- Border radius: `8px`
- Padding: `20px` (medium cards), `24px` (large detail cards)
- Box shadow: `0 1px 3px rgba(0, 0, 0, 0.3)` (subtle depth)
- Hover state: Border → `var(--border-medium)`, background → `var(--bg-secondary)`

**Badges/Pills**:
- Border radius: `12px` (fully rounded)
- Padding: `4px 10px`
- Font size: `12px`
- Font weight: `500` (medium)
- Text transform: `uppercase`
- Letter spacing: `0.5px`
- Status badges: Background with 15% opacity + solid text color
  - Example: Pending → `background: rgba(245, 158, 11, 0.15)`, `color: #f59e0b`

**Buttons**:
- Primary action:
  - Background: `var(--accent-primary)`
  - Color: `#ffffff`
  - Hover: Background → `var(--accent-hover)`
  - Active: Background → `var(--accent-active)`
- Confirm (success):
  - Background: `var(--success)`
  - Hover: Background → `#16a34a`
- Reject (danger):
  - Background: `var(--error)`
  - Hover: Background → `#dc2626`
- Needs Review (warning):
  - Background: `var(--warning)`
  - Hover: Background → `#d97706`
- Ghost/Secondary:
  - Background: `transparent`
  - Border: `1px solid var(--border-medium)`
  - Color: `var(--text-secondary)`
  - Hover: Background → `var(--bg-secondary)`, border → `var(--border-active)`
- Border radius: `6px`
- Padding: `10px 20px`
- Font weight: `500`
- Transition: `all 0.2s ease`

**Inputs & Textareas**:
- Background: `var(--bg-input)`
- Border: `1px solid var(--border-subtle)`
- Border radius: `6px`
- Padding: `10px 14px`
- Color: `var(--text-primary)`
- Placeholder: `var(--text-placeholder)`
- Focus: Border → `var(--border-focus)`, outline → `2px solid rgba(20, 184, 166, 0.3)`
- Transition: `border 0.15s ease, outline 0.15s ease`

**Tables**:
- Header background: `var(--bg-secondary)`
- Header text: `var(--text-muted)`, `text-transform: uppercase`, `font-size: 12px`, `font-weight: 600`
- Row border: `1px solid var(--border-subtle)`
- Row hover: Background → `var(--bg-secondary)`
- Cell padding: `12px 16px`
- Highlighted cells (conflicts): Background → `rgba(239, 68, 68, 0.1)`, border-left → `2px solid var(--error)`

**Citations**:
- Background: `var(--bg-secondary)`
- Border-left: `3px solid var(--accent-primary)` (accent bar)
- Padding: `16px 20px`
- Quote text: `font-size: 15px`, `line-height: 1.6`, `color: var(--text-secondary)`
- Metadata: `font-size: 13px`, `color: var(--text-muted)`
- Agency highlight: Background → `rgba(20, 184, 166, 0.15)`, padding → `2px 6px`, border-radius → `3px`
- PDF link: Color → `var(--accent-primary)`, hover → `var(--accent-hover)`, external icon in `var(--text-muted)`

**Progress Stats**:
- Card background: `var(--bg-primary)`
- Metric numbers: `font-size: 32px`, `font-weight: 600`, `color: var(--text-primary)`
- Metric labels: `font-size: 13px`, `color: var(--text-muted)`
- Success rate (positive): Color → `var(--success)`
- Success rate (warning): Color → `var(--warning)`
- Percentage bar: Background → `var(--bg-secondary)`, fill → `var(--accent-primary)`, height → `6px`, border-radius → `3px`

**Queue Status**:
- Available count: Color → `var(--success)`, font-weight → `600`
- In review count: Color → `var(--status-being-reviewed)`, font-weight → `600`
- Timer display: Monospace font, color → `var(--text-muted)`
- Lock indicator: Icon + text, color → `var(--status-being-reviewed)`

**Scrollbars** (for webkit browsers):
```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-app);
}

::-webkit-scrollbar-thumb {
  background: var(--border-medium);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--border-active);
}
```

### Typography

**Font Family**: 
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

**Font Weights**:
- Headings: `600` (semibold)
- Subheadings: `500` (medium)
- Body: `400` (normal)
- Metadata/labels: `500` (medium)
- Numbers/stats: `600` (semibold)

**Font Sizes**:
- H1 (page title): `28px`
- H2 (section): `20px`
- H3 (subsection): `16px`
- Body: `14px`
- Small: `13px`
- Caption/metadata: `12px`
- Labels (uppercase): `11px`

**Line Heights**:
- Headings: `1.2`
- Body text: `1.5`
- Compact lists: `1.4`

**Monospace Font**: For POST IDs, dates, UIDs, timers
```css
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', monospace;
```

### Spacing

**Container & Layout**:
- Column gap: `24px`
- Left column width: `340px`
- Right column: `flex: 1` (fills remaining space)
- Max width for right column content: `1200px`
- Section spacing (vertical): `32px`

**Card Spacing**:
- Card gap (in left column): `16px`
- Card internal padding: `20px` (standard), `24px` (detail view)
- Section padding within cards: `20px 0`

**Element Spacing**:
- Between related elements: `12px`
- Between sections: `24px`
- Between form fields: `16px`
- Inline spacing (badges, tags): `8px`

**Tight Spacing** (for compact layouts):
- Between metadata items: `8px`
- Icon + text gap: `8px`

### Border Radius

- Cards: `8px`
- Buttons: `6px`
- Badges/pills: `12px` (fully rounded)
- Inputs: `6px`
- Small elements (tags): `4px`

### Transitions & Animations

**Standard Transitions**:
```css
transition: all 0.15s ease;
```

**Hover Transitions**:
```css
transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.15s ease;
```

**Focus Transitions** (inputs):
```css
transition: border-color 0.15s ease, outline 0.15s ease;
```

**Subtle Hover Effects**:
- Buttons: `transform: translateY(-1px)`, `box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2)`

**Loading States**:
- Pulse animation for skeleton loaders
- Spinner for async actions
- Fade in for content appearing

### Elevation/Depth System

- Level 0 (flat): No shadow
- Level 1 (cards): `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3)`
- Level 2 (raised cards on hover): `box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3)`
- Level 3 (modals, dialogs): `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4)`

### Icon System

**Icon Library**: Lucide React

**Icon Sizes**:
- Small: `14px`
- Medium: `16px`
- Large: `20px`
- Extra large: `24px`

**Icon Colors**:
- Primary: `var(--text-primary)`
- Secondary: `var(--text-muted)`
- Accent: `var(--accent-primary)`
- Status icons: Match respective status colors

**Icon Usage**:
- External links: Arrow up-right icon in `var(--text-muted)`
- Lock indicator: Lock icon in `var(--status-being-reviewed)`
- Timer: Clock icon in `var(--text-muted)`
- Validation actions: Checkmark (confirm), X (reject), Eye (review)
- Next officer: Arrow right icon

---

## Technical Implementation

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase
- **Data Fetching**: React Query (TanStack Query)
- **Styling**: SCSS Modules
- **Language**: TypeScript
- **Real-time**: Supabase Realtime (for stats updates)
- **Deployment**: Vercel

### Dependencies to Install

```bash
# Supabase client
npm install @supabase/supabase-js

# React Query
npm install @tanstack/react-query

# SCSS support
npm install sass

# Form handling
npm install react-hook-form

# Toast notifications
npm install sonner

# Date utilities
npm install date-fns

# shadcn 
npm i shadcn-ui
```

### File Structure

```
post-validation/
├── app/
│   ├── layout.tsx (root layout, React Query provider)
│   ├── page.tsx (redirect to /dashboard)
│   ├── dashboard/
│   │   └── page.tsx (main dashboard page)
│   ├── api/
│   │   └── officers/
│   │       ├── claim/
│   │       │   └── route.ts (POST - claim next officer)
│   │       ├── validate/
│   │       │   └── route.ts (POST - validate officer)
│   │       └── release/
│   │           └── route.ts (POST - release current officer)
│   └── globals.scss (dark theme CSS variables)
├── components/
│   ├── DashboardLayout.tsx
│   ├── DashboardLayout.module.scss
│   ├── ProgressStats.tsx
│   ├── ProgressStats.module.scss
│   ├── QueueStatus.tsx
│   ├── QueueStatus.module.scss
│   ├── OfficerDetail.tsx
│   ├── OfficerDetail.module.scss
│   ├── CitationCard.tsx
│   └── CitationCard.module.scss
├── lib/
│   ├── supabase.ts (Supabase client setup)
│   ├── queries.ts (Database query functions)
│   └── types.ts (TypeScript interfaces)
├── hooks/
│   ├── useClaimOfficer.ts
│   ├── useOfficerDetail.ts
│   ├── useValidationStats.ts
│   ├── useQueueStatus.ts
│   └── useValidateOfficer.ts
├── supabase/
│   ├── migrations/
│   │   └── 001_add_lock_fields.sql
│   └── data/
│       └── input/
│           └── matched_clean_with_conflict_citations_with_urls.json
└── plans/
    └── officer-validation-plan-v2.md (this file)
```

---

## Database Schema

### Supabase Table: `officer_validations`

**Updated Schema**:
```sql
CREATE TABLE officer_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_uid TEXT UNIQUE NOT NULL,
  provisional_case_name TEXT NOT NULL,
  data JSONB NOT NULL,
  
  -- Lock fields for assignment
  being_reviewed_by TEXT, -- validator_id or session_id
  being_reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mention_uid ON officer_validations(mention_uid);
CREATE INDEX idx_case_name ON officer_validations(provisional_case_name);
CREATE INDEX idx_validation_status ON officer_validations((data->'validation'->>'status'));
CREATE INDEX idx_being_reviewed ON officer_validations(being_reviewed_by, being_reviewed_at);

-- Index for finding stale locks
CREATE INDEX idx_stale_locks ON officer_validations(being_reviewed_at) 
WHERE being_reviewed_at IS NOT NULL;
```

### JSONB Structure

The `data` column contains:
```json
{
  "officer_info": {
    "mention_uid": "...",
    "provisional_case_name": "...",
    "document_link": "...",
    "matched_post_id": "B05-C48",
    "match_probability": 0.8052,
    "first_name": "MICHAEL",
    "middle_name": "JAMES",
    "last_name": "WEBB",
    "matched_agency": "SAN DIEGO POLICE DEPARTMENT",
    "total_employment_stints": 4
  },
  "matched_officer_employment_history": [...],
  "other_officers_with_same_name": [...],
  "citations": [
    {
      "file_name": "incident_report_2016.pdf",
      "file_id": "...",
      "page_number": 3,
      "quote": "Officer Michael Webb of San Diego PD...",
      "agency_name": "SAN DIEGO POLICE DEPARTMENT",
      "blob_url": "https://...blob.core.windows.net/..."
    }
  ],
  "citation_count": 1,
  "validation": {
    "status": "pending", // pending | being_reviewed | correct | incorrect | needs_review
    "validated_by": null,
    "validated_at": null,
    "notes": null
  }
}
```

### Migration Script

```sql
-- Add lock fields to existing table
ALTER TABLE officer_validations 
ADD COLUMN being_reviewed_by TEXT,
ADD COLUMN being_reviewed_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX idx_being_reviewed ON officer_validations(being_reviewed_by, being_reviewed_at);
CREATE INDEX idx_stale_locks ON officer_validations(being_reviewed_at) 
WHERE being_reviewed_at IS NOT NULL;

-- Update validation status to include being_reviewed
-- (Manual update of existing data JSONB if needed)
```

---

## API Endpoints

### 1. Claim Next Officer
**Endpoint**: `POST /api/officers/claim`

**Request Body**:
```json
{
  "validatorId": "user_123"
}
```

**Response**:
```json
{
  "success": true,
  "officer": {
    "id": "uuid",
    "mention_uid": "...",
    "data": { ... }
  }
}
```

**Logic**:
```typescript
// Use transaction to ensure atomicity
const { data, error } = await supabase.rpc('claim_next_officer', {
  validator_id: validatorId
});

// SQL function:
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
  FOR UPDATE SKIP LOCKED;
  
  -- If found, claim it
  IF officer.id IS NOT NULL THEN
    UPDATE officer_validations
    SET being_reviewed_by = validator_id,
        being_reviewed_at = NOW(),
        data = jsonb_set(data, '{validation,status}', '"being_reviewed"')
    WHERE id = officer.id;
    
    -- Return updated officer
    SELECT * INTO officer FROM officer_validations WHERE id = officer.id;
  END IF;
  
  RETURN officer;
END;
$$ LANGUAGE plpgsql;
```

### 2. Validate Officer
**Endpoint**: `POST /api/officers/validate`

**Request Body**:
```json
{
  "mentionUid": "...",
  "validatorId": "user_123",
  "status": "correct",
  "notes": "Employment dates match citations"
}
```

**Response**:
```json
{
  "success": true,
  "officer": {
    "mention_uid": "...",
    "data": { ... }
  }
}
```

**Logic**:
```typescript
const { data, error } = await supabase
  .from('officer_validations')
  .update({
    being_reviewed_by: null,
    being_reviewed_at: null,
    data: {
      ...existingData,
      validation: {
        status: status, // 'correct' | 'incorrect' | 'needs_review'
        validated_by: validatorId,
        validated_at: new Date().toISOString(),
        notes: notes
      }
    },
    updated_at: new Date().toISOString()
  })
  .eq('mention_uid', mentionUid)
  .eq('being_reviewed_by', validatorId) // Ensure validator owns the lock
  .select()
  .single();
```

### 3. Release Officer
**Endpoint**: `POST /api/officers/release`

**Request Body**:
```json
{
  "mentionUid": "...",
  "validatorId": "user_123"
}
```

**Response**:
```json
{
  "success": true
}
```

**Logic**:
```typescript
const { error } = await supabase
  .from('officer_validations')
  .update({
    being_reviewed_by: null,
    being_reviewed_at: null,
    data: supabase.rpc('jsonb_set', {
      target: data,
      path: '{validation,status}',
      new_value: '"pending"'
    })
  })
  .eq('mention_uid', mentionUid)
  .eq('being_reviewed_by', validatorId);
```

### 4. Get Validation Stats
**Endpoint**: `GET /api/officers/stats`

**Response**:
```json
{
  "total": 1000,
  "pending": 750,
  "inReview": 50,
  "validated": 200,
  "correct": 180,
  "incorrect": 15,
  "needsReview": 5,
  "successRate": 0.923
}
```

**Logic**:
```typescript
// Aggregate client-side or use custom SQL function
const { data } = await supabase
  .from('officer_validations')
  .select('data->validation->>status, being_reviewed_by');

// Aggregate
const stats = data.reduce((acc, row) => {
  const status = row.status;
  if (status === 'pending' || status === 'being_reviewed') {
    acc.pending++;
    if (row.being_reviewed_by) acc.inReview++;
  } else {
    acc.validated++;
    if (status === 'correct') acc.correct++;
    if (status === 'incorrect') acc.incorrect++;
    if (status === 'needs_review') acc.needsReview++;
  }
  acc.total++;
  return acc;
}, { total: 0, pending: 0, inReview: 0, validated: 0, correct: 0, incorrect: 0, needsReview: 0 });

stats.successRate = stats.correct / (stats.correct + stats.incorrect);
```

### 5. Get Queue Status
**Endpoint**: `GET /api/officers/queue?validatorId=user_123`

**Response**:
```json
{
  "available": 750,
  "inReview": 50,
  "yourOfficer": {
    "mention_uid": "...",
    "officer_name": "MICHAEL WEBB",
    "started_at": "2026-01-17T14:30:00Z",
    "time_elapsed_minutes": 15
  }
}
```

**Logic**:
```typescript
// Count available
const { count: available } = await supabase
  .from('officer_validations')
  .select('*', { count: 'exact', head: true })
  .eq('data->validation->>status', 'pending')
  .is('being_reviewed_by', null);

// Count in review
const { count: inReview } = await supabase
  .from('officer_validations')
  .select('*', { count: 'exact', head: true })
  .not('being_reviewed_by', 'is', null);

// Get validator's current officer
const { data: yourOfficer } = await supabase
  .from('officer_validations')
  .select('mention_uid, data, being_reviewed_at')
  .eq('being_reviewed_by', validatorId)
  .single();

// Calculate time elapsed
const timeElapsedMinutes = yourOfficer 
  ? Math.floor((Date.now() - new Date(yourOfficer.being_reviewed_at).getTime()) / 60000)
  : null;
```

---

## Background Jobs

### Stale Lock Cleanup Job

**Purpose**: Release officers locked by validators who abandoned their reviews

**Schedule**: Runs every 5 minutes (cron job or Supabase Edge Function)

**Logic**:
```typescript
// Find stale locks (>30 minutes old)
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

const { data: staleOfficers } = await supabase
  .from('officer_validations')
  .select('*')
  .eq('data->validation->>status', 'being_reviewed')
  .lt('being_reviewed_at', thirtyMinutesAgo);

// Release each stale lock
for (const officer of staleOfficers) {
  await supabase
    .from('officer_validations')
    .update({
      being_reviewed_by: null,
      being_reviewed_at: null,
      data: {
        ...officer.data,
        validation: {
          ...officer.data.validation,
          status: 'pending'
        }
      }
    })
    .eq('id', officer.id);
  
  // Log abandoned lock for monitoring
  console.log(`Released stale lock: ${officer.mention_uid} (validator: ${officer.being_reviewed_by})`);
}
```

**Implementation Options**:
1. Supabase Edge Function with pg_cron extension
2. Next.js API route called by external cron service (e.g., Vercel Cron, GitHub Actions)
3. Separate background worker service

---

## Validation Workflow (User Journey)

### Step-by-Step Flow

1. **Land on Dashboard**
   - See progress stats at top left (total, validated, success rate)
   - See queue status (750 available, 50 in review)
   - Right side shows empty state: "Click 'Get Next Officer' to begin"
   - Prominent "Get Next Officer" button in left column

2. **Claim First Officer**
   - Click "Get Next Officer"
   - Button shows loading spinner
   - System atomically claims next pending officer
   - Officer is locked to this validator
   - URL updates: `?officer=mention_uid`
   - Right side loads with officer details
   - Timer starts in queue status: "Reviewing for 0 min"

3. **Review Officer Header**
   - See input officer name (from mentions)
   - See matched officer name and POST ID
   - See match probability with color-coded indicator
   - See matched agency
   - See lock indicator: "Assigned to you at 2:45 PM"

4. **Compare Employment Histories**
   - **Left side**: Review matched officer's employment history
     - Agencies, dates, durations, separation reasons
   - **Right side**: Check for other officers with same name
     - Look for conflicts (different agencies, overlapping dates)
     - Warning highlights if conflicts exist
   - **Empty state**: "No conflicting officers found" if no others exist

5. **Verify with Citations**
   - Read each citation quote
   - Check that agency names in quotes match matched_agency
   - Verify dates mentioned align with employment history
   - Click PDF links to see full documents if needed
   - Warning if no citations: "No citations found - verify manually"

6. **Assess Match Quality**
   - High probability (>0.85) + matching citations + no conflicts = likely correct
   - Low probability (<0.7) or agency mismatch = likely incorrect
   - Conflicting officers or unclear citations = needs review

7. **Make Decision**
   - Click one of three buttons:
     - **"Confirm Match"** (green) - Employment + citations align perfectly
     - **"Reject Match"** (red) - Wrong person or clear agency mismatch
     - **"Needs Review"** (yellow) - Uncertain, need expert review
   - Optionally add notes in textarea:
     - "Dates match perfectly with all citations"
     - "Different Michael Webb - agency doesn't match"
     - "Unclear if same person - need additional verification"

8. **Confirm Action**
   - Confirmation dialog appears:
     - "Are you sure you want to mark this as CORRECT?"
     - Shows officer name and decision
     - "Confirm" and "Cancel" buttons
   - Click "Confirm"

9. **Complete Validation**
   - Loading state while saving
   - Database updates:
     - Status → correct/incorrect/needs_review
     - Lock released (being_reviewed_by → null)
     - Validation metadata saved (who, when, notes)
   - Success toast: "✓ Validation saved successfully"
   - Progress stats update in real-time
   - Queue status updates (available count changes)

10. **Get Next Officer**
    - Two options:
      - **Auto-next** (optional feature): System immediately claims next officer
      - **Manual** (default): Empty state reappears with "Get Next Officer" button
    - Click button to start cycle again
    - If no officers available: "No officers available for review"

### Edge Cases

**No Citations**:
- Display warning: "⚠️ No citations found - verify manually"
- Encourage validator to be extra careful
- Consider marking as "needs_review" if uncertain

**Multiple Conflicts**:
- Show count: "⚠️ 3 other officers found with same name"
- Highlight differences in employment table
- Red warning if dates overlap significantly

**High Match Probability**:
- Green indicator for >0.85
- Visual cue that this is likely correct
- Still requires manual verification

**Low Match Probability**:
- Red indicator for <0.7
- Warning: "Low confidence match - review carefully"
- May need more thorough citation review

**Abandoned Review**:
- If validator leaves page without validating
- Lock automatically released after 30 minutes
- Officer returns to pending queue
- Other validators can claim it

**No Officers Available**:
- Message: "🎉 No officers available for review"
- Subtext: "All officers are either validated or being reviewed"
- Option to check back later
- Stats show completion progress

**Network Error During Claim**:
- Retry automatically (React Query retry logic)
- If fails: "Failed to claim officer - please try again"
- Retry button available

**Another Validator Claims Same Officer** (race condition):
- Very rare due to atomic transaction
- If happens: Show message "This officer was claimed by another validator"
- Automatically fetch next available officer

---

## Implementation Phases

### Phase 1: Database & Infrastructure Setup ✅ COMPLETED
**Time**: 2-3 hours
**Actual**: ~2 hours
**Completed**: 2026-01-17

1. ✅ Set up Supabase client in Next.js
2. ✅ Create TypeScript types for officer data
3. ✅ Set up React Query provider
4. ✅ Create dark theme CSS variables
5. ✅ install shadcn which we will use

**Deliverable**: Database ready, types defined, providers configured

**See**: `todo/phase-1-checklist.md` and `todo/phase-1-summary.md`

### Phase 2: API Routes ✅ COMPLETED
**Time**: 3-4 hours
**Actual**: ~2.5 hours
**Completed**: 2026-01-17

1. ✅ Create `/api/officers/claim` endpoint
2. ✅ Create `/api/officers/validate` endpoint
3. ✅ Create `/api/officers/release` endpoint
4. ✅ Create `/api/officers/stats` endpoint
5. ✅ Create `/api/officers/queue` endpoint
6. ✅ Test all endpoints with automated test suite
7. ✅ Handle errors and edge cases
8. ✅ Create SQL function for atomic claiming
9. ✅ Complete API documentation

**Deliverable**: All API endpoints working and tested

**See**: `todo/phase-2-checklist.md`, `todo/phase-2-summary.md`, `API_DOCUMENTATION.md`

### Phase 3: React Query Hooks
**Time**: 2-3 hours

1. Build `useClaimOfficer()` mutation hook
2. Build `useOfficerDetail()` query hook
3. Build `useValidationStats()` query hook (with 30s polling)
4. Build `useQueueStatus()` query hook (with 10s polling)
5. Build `useValidateOfficer()` mutation hook
6. Set up query invalidation logic
7. Test hooks in isolation

**Deliverable**: All data fetching logic working

### Phase 4: Core Components
**Time**: 5-7 hours

1. Build `DashboardLayout` component (structure only)
2. Build `ProgressStats` component with real data
3. Build `QueueStatus` component with timer
4. Build `OfficerDetail` component:
   - Header section
   - Employment comparison (side-by-side tables)
   - Citations section
   - Validation actions section
   - Empty state
5. Build `CitationCard` component
6. Wire up all components with hooks

**Deliverable**: Full UI rendering with real data

### Phase 5: Validation Flow
**Time**: 3-4 hours

1. Implement "Get Next Officer" button logic
2. Add validation buttons (Confirm/Reject/Needs Review)
3. Build confirmation dialog
4. Wire up validation mutations
5. Add toast notifications (using Sonner)
6. Handle success/error states
7. Add loading states throughout
8. Implement "Release Officer" functionality

**Deliverable**: Complete validation workflow working

### Phase 6: Polish & Testing
**Time**: 3-5 hours

1. Refine dark theme styling across all components
2. Add loading skeletons for async states
3. Add smooth transitions and animations
4. Test full workflow end-to-end
5. Test edge cases (no officers, network errors, etc.)
6. Add timer display and formatting
7. Test multi-validator scenarios (manual testing with multiple browser tabs)
8. Performance optimization
9. Accessibility checks

**Deliverable**: Polished, production-ready UI

### Phase 7: Background Jobs
**Time**: 2-3 hours

1. Create stale lock cleanup function
2. Set up Supabase Edge Function or Vercel Cron
3. Test lock release logic
4. Add monitoring/logging
5. Configure schedule (every 5 minutes)

**Deliverable**: Automated lock cleanup working

### Phase 8: Deployment
**Time**: 1-2 hours

1. Configure environment variables in Vercel
2. Test in staging environment
3. Deploy to production
4. Verify all features working in production
5. Monitor for errors
6. Document deployment process

**Deliverable**: Live production dashboard

**Total Estimated Time**: 21-31 hours for MVP

---

## Key Features

### Must Have (MVP)
- ✅ Two-column dark theme layout
- ✅ Real-time progress stats
- ✅ Queue status with timer
- ✅ Atomic officer assignment (lock mechanism)
- ✅ Officer detail view
- ✅ Employment comparison (matched vs others)
- ✅ Citations display with PDF links
- ✅ Validation actions (Confirm/Reject/Review)
- ✅ Notes field
- ✅ Lock release mechanism
- ✅ Stale lock cleanup (30 min timeout)
- ✅ Toast notifications

### Nice to Have (Post-MVP)
- [ ] Auto-fetch next officer after validation
- [ ] Keyboard shortcuts (C=confirm, R=reject, N=needs review, Enter=get next)
- [ ] Validation history view (who validated what)
- [ ] Undo last validation (within 5 minutes)
- [ ] Bulk export to CSV
- [ ] Advanced metrics dashboard (avg time per officer, validator leaderboard)
- [ ] PDF preview modal (instead of new tab)
- [ ] Officer comments/discussion thread
- [ ] Manual officer assignment (assign specific officer to validator)
- [ ] Validator profiles and stats

### Not Needed
- ❌ User authentication (handle separately, assume validator ID from session)

---


---

## Environment Variables

**Required**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```