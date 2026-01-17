# Officer Validation Dashboard 


---

## Overview

A two-column dark-themed dashboard for validating officer matches. Validators compare employment histories, check for conflicts, and verify matches against citation evidence from documents.

### Core Workflow
1. Select officer from filtered list
2. Compare matched officer vs other officers with same name
3. Review citations (quotes, agency names, dates) to verify match
4. Make validation decision (Confirm/Reject/Needs Review)

---

## Architecture

### Layout Structure

**Two-Column Dashboard**
- **Left Column (350px)**: Progress stats + filters + officer list
- **Right Column (flex)**: Officer detail view + validation actions

### Component Strategy

**6 Components Total** (minimal and focused):

1. **DashboardLayout** - Two-column container
2. **ProgressStats** - Validation metrics card
3. **OfficerList** - Filters + scrollable officer cards
4. **OfficerDetail** - Main detail view with all sections
5. **EmploymentComparison** - Side-by-side employment history
6. **CitationCard** - Individual citation display

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
├─────────────┤        Officer Detail            │
│             │                                  │
│   Filters   │                                  │
│             │                                  │
├─────────────┤                                  │
│             │                                  │
│   Officer   │                                  │
│    List     │                                  │
│ (scrollable)│                                  │
│             │                                  │
└─────────────┴──────────────────────────────────┘
```

### 2. ProgressStats
**Purpose**: Show validation progress and metrics

**Data displayed**:
- Total officers
- Validated count and percentage
- Status breakdown (Correct: X, Incorrect: Y, Needs Review: Z)
- Success rate: correct / (correct + incorrect)

**Styling**: Card with dark background, colored badges for each status

### 3. OfficerList
**Purpose**: Filterable, scrollable list of officers

**Features**:
- Status filter dropdown (All, Pending, Validated, Correct, Incorrect, Needs Review)
- Search input (officer name)
- Officer cards showing:
  - Full name
  - Matched agency
  - Match probability (color-coded based on confidence)
  - Status badge
- Active state for selected officer
- Click to select (updates URL)

**Behavior**: Auto-scroll to selected officer when changed

### 4. OfficerDetail
**Purpose**: Main content area showing full officer information

**Sections** (vertically stacked):

**Header Section**:
- Input officer name (from mentions)
- Matched officer name and POST ID
- Match probability with visual indicator
- Matched agency

**Employment Comparison Section**:
- Uses EmploymentComparison component
- Shows matched officer history vs conflicting officers

**Citations Section**:
- List of CitationCard components
- Each citation shows evidence from documents

**Validation Actions Section**:
- Three buttons: Confirm (green), Reject (red), Needs Review (yellow)
- Notes textarea
- Submit triggers confirmation dialog

**Empty State**: Shows message when no officer selected

### 5. EmploymentComparison
**Purpose**: Compare employment histories side-by-side

**Layout**: Two columns

**Left Column**: Matched Officer Employment History
- Table with: Agency, Start Date, End Date, Duration, Separation Reason
- Highlighted as the "matched" record

**Right Column**: Other Officers with Same Name
- Same table structure
- Shows all other POST records with same/similar name
- Highlights differences (different agency, overlapping dates)
- Warning indicator if dates overlap or names are suspiciously similar

**Empty State**: "No conflicting officers found" if other_officers_with_same_name is empty

### 6. CitationCard
**Purpose**: Display individual citation evidence

**Content**:
- Document quote (with agency name highlighted)
- File name
- Page number
- Agency name badge
- Link to PDF (opens in new tab with external link icon)

**Styling**: Dark card with border, quote in slightly larger text, metadata in muted color

---

## Data Flow & State Management

### Server State (React Query)

**4 Hooks**:

1. `useOfficers(filters)` - Fetches officer list
   - Filters: status, search
   - Returns: Array of officer_validations records

2. `useOfficerDetail(mentionUid)` - Fetches single officer
   - Returns: Full officer_validations record with all JSONB data

3. `useValidationStats()` - Fetches aggregate stats
   - Returns: { total, validated, pending, correct, incorrect, needsReview, successRate }

4. `useUpdateValidation()` - Mutation for validation updates
   - Updates validation.status, validation.notes, validation.validated_at
   - Invalidates queries to refresh UI

### UI State (URL Parameters)

- `?officer={mention_uid}` - Selected officer
- `?status={filter}` - Status filter
- `?search={name}` - Search query

### Data Flow Diagram

```
User Action (Select Officer)
    ↓
URL updates (?officer=mention_uid)
    ↓
useOfficerDetail hook triggers
    ↓
Supabase query fetches data
    ↓
OfficerDetail component renders
    ↓
User reviews & clicks validation button
    ↓
useUpdateValidation mutation
    ↓
Database updated
    ↓
Queries invalidated & refetched
    ↓
UI updates (list, stats, detail)
    ↓
Toast notification shows success
```

---

## UI/UX Design

### Dark Theme Palette

**Backgrounds**:
- `--bg-primary: #0a0a0a` (main background)
- `--bg-secondary: #1a1a1a` (cards)
- `--bg-tertiary: #2a2a2a` (hover states)

**Borders**:
- `--border: #2a2a2a`
- `--border-focus: #3a3a3a`

**Text**:
- `--text-primary: #ffffff`
- `--text-secondary: #a3a3a3`
- `--text-muted: #737373`

**Status Colors**:
- `--status-pending: #fbbf24` (amber)
- `--status-correct: #22c55e` (green)
- `--status-incorrect: #ef4444` (red)
- `--status-review: #3b82f6` (blue)

**Match Probability Colors**:
- High (>0.85): Green
- Medium (0.7-0.85): Yellow
- Low (<0.7): Red

### Typography

**Font Family**: Inter or system font stack

**Font Weights**:
- Headings: 600 (semibold)
- Body: 400 (normal)
- Emphasis: 500 (medium)

**Font Sizes**:
- H1 (page title): 32px
- H2 (section): 24px
- H3 (subsection): 20px
- Body: 16px
- Small: 14px
- Caption: 12px

**Monospace**: For POST IDs, dates, UIDs

### Spacing

- Container gap: 24px
- Card padding: 24px
- Section spacing: 32px
- Element spacing: 16px
- Tight spacing: 8px

### Border Radius

- Cards: 8px
- Buttons: 6px
- Badges: 4px

---

## Technical Implementation

### Tech Stack

- **Framework**: Next.js 14+ (App Router) ✅ Already set up
- **Database**: Supabase
- **Data Fetching**: React Query (TanStack Query)
- **Styling**: SCSS Modules
- **Language**: TypeScript
- **Deployment**: Vercel ✅ Already configured

### Dependencies to Install

```bash
# Supabase client
npm install @supabase/supabase-js

# React Query
npm install @tanstack/react-query

# SCSS support
npm install sass

# Optional: Form handling
npm install react-hook-form

# Optional: Toast notifications
npm install sonner
```

### File Structure

```
post-validation/
├── app/
│   ├── layout.tsx (root layout, React Query provider)
│   ├── page.tsx (redirect to /dashboard)
│   ├── dashboard/
│   │   └── page.tsx (main dashboard page)
│   └── globals.scss (dark theme CSS variables)
├── components/
│   ├── DashboardLayout.tsx
│   ├── DashboardLayout.module.scss
│   ├── ProgressStats.tsx
│   ├── ProgressStats.module.scss
│   ├── OfficerList.tsx
│   ├── OfficerList.module.scss
│   ├── OfficerDetail.tsx
│   ├── OfficerDetail.module.scss
│   ├── EmploymentComparison.tsx
│   ├── EmploymentComparison.module.scss
│   ├── CitationCard.tsx
│   └── CitationCard.module.scss
├── lib/
│   ├── supabase.ts (Supabase client setup)
│   ├── queries.ts (Database query functions)
│   └── types.ts (TypeScript interfaces)
├── hooks/
│   ├── useOfficers.ts
│   ├── useOfficerDetail.ts
│   ├── useValidationStats.ts
│   └── useUpdateValidation.ts
├── supabase/
│   └── data/
│       └── input/
│           └── matched_clean_with_conflict_citations_with_urls.json
└── plans/
    └── 2026-01-17-officer-validation-simplified.md (this file)
```

---

## Database Integration

### Supabase Table: `officer_validations`

**Schema**:
```sql
officer_validations
├── id (UUID, primary key)
├── mention_uid (TEXT) - Indexed for quick lookup
├── provisional_case_name (TEXT) - Indexed
├── data (JSONB) - Full officer record
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
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
    "status": "pending",
    "validated_by": null,
    "validated_at": null,
    "notes": null
  }
}
```

### Key Queries

**1. Fetch Officers with Filters**
```typescript
const query = supabase
  .from('officer_validations')
  .select('id, mention_uid, provisional_case_name, data')
  .order('created_at', { ascending: false })

// Apply status filter
if (status !== 'all') {
  query.eq('data->validation->>status', status)
}

// Apply search filter
if (search) {
  query.or(`
    data->officer_info->>last_name.ilike.%${search}%,
    data->officer_info->>first_name.ilike.%${search}%
  `)
}
```

**2. Fetch Single Officer**
```typescript
const { data } = await supabase
  .from('officer_validations')
  .select('*')
  .eq('mention_uid', mentionUid)
  .single()
```

**3. Update Validation Status**
```typescript
const { data } = await supabase
  .from('officer_validations')
  .update({
    data: {
      ...existingData,
      validation: {
        status: 'correct',
        validated_by: 'user_id',
        validated_at: new Date().toISOString(),
        notes: 'Verified employment dates match citations'
      }
    },
    updated_at: new Date().toISOString()
  })
  .eq('mention_uid', mentionUid)
```

**4. Get Validation Stats**
```typescript
// This requires custom SQL or client-side aggregation
// Option 1: Custom SQL function in Supabase
// Option 2: Fetch all and aggregate in React Query
const { data } = await supabase
  .from('officer_validations')
  .select('data->validation->>status')

// Aggregate client-side
const stats = data.reduce((acc, row) => {
  const status = row.data.validation.status
  acc[status] = (acc[status] || 0) + 1
  return acc
}, {})
```

---

## Implementation Phases

### Phase 1: Setup & Infrastructure
**Time**: 1-2 hours

1. Install dependencies
2. Set up Supabase client
3. Create TypeScript types
4. Set up React Query provider
5. Create dark theme CSS variables

### Phase 2: Data Layer
**Time**: 2-3 hours

1. Create database query functions (`lib/queries.ts`)
2. Build React Query hooks
3. Test queries with existing data
4. Handle loading and error states

### Phase 3: Core Components
**Time**: 4-6 hours

1. Build DashboardLayout (structure only)
2. Build ProgressStats (fetch and display stats)
3. Build OfficerList (filters + list)
4. Build OfficerDetail (header + sections)
5. Build EmploymentComparison (tables)
6. Build CitationCard (card display)

### Phase 4: Validation Actions
**Time**: 2-3 hours

1. Add validation buttons to OfficerDetail
2. Implement confirmation dialog
3. Wire up useUpdateValidation mutation
4. Add toast notifications
5. Handle success/error states

### Phase 5: Polish & Testing
**Time**: 2-4 hours

1. Refine dark theme styling
2. Add loading skeletons
3. Add empty states
4. Test full validation workflow
5. Test filtering and search
6. Mobile responsiveness (optional)

### Phase 6: Deployment
**Time**: 1 hour

1. Configure environment variables in Vercel
2. Deploy to production
3. Test in production environment

**Total Estimated Time**: 12-19 hours for MVP

---

## Validation Workflow (User Journey)

### Step-by-Step Flow

1. **Land on Dashboard**
   - See progress stats at top left
   - See filtered list of officers below
   - Right side shows "Select an officer to begin"

2. **Apply Filters (Optional)**
   - Select status filter: "Pending" to see only unvalidated
   - Or search by name: "Webb"
   - List updates immediately

3. **Select Officer**
   - Click officer card in list
   - Card highlights as active
   - URL updates: `?officer=mention_uid`
   - Right side loads officer detail

4. **Review Matched Officer**
   - See header with matched officer name, POST ID, probability
   - Review matched agency

5. **Compare Employment Histories**
   - Look at matched officer's employment stints
   - Check if other officers exist with same name
   - Compare dates, agencies, names
   - Look for conflicts or overlaps

6. **Verify with Citations**
   - Read citation quotes
   - Check that agency name in quote matches matched_agency
   - Verify dates mentioned align with employment history
   - Click PDF link if need to see full document

7. **Make Decision**
   - Click "Confirm Match" if employment + citations align
   - Click "Reject Match" if wrong person or agency mismatch
   - Click "Needs Review" if uncertain or need expert review
   - Optionally add notes

8. **Confirm Action**
   - Confirmation dialog appears
   - Review decision
   - Click "Confirm"

9. **Update & Continue**
   - Status updates in database
   - Toast notification: "Validation saved"
   - Stats update in left column
   - Officer card in list updates with new status badge
   - Next pending officer auto-loads (optional)

### Edge Cases

**No Citations**: Show warning "No citations found - verify manually"

**Multiple Conflicts**: Highlight count "3 other officers found with same name"

**High Match Probability**: Show visual indicator for >0.85 probability

**Low Match Probability**: Show warning for <0.7 probability

---

## Key Features

### Must Have (MVP)
- [x] Two-column dark theme layout
- [x] Progress stats display
- [x] Officer list with status filter
- [x] Officer search by name
- [x] Officer detail view
- [x] Employment comparison (matched vs others)
- [x] Citations display with PDF links
- [x] Validation actions (Confirm/Reject/Review)
- [x] Notes field
- [x] Database updates

### Nice to Have (Post-MVP)
- [ ] Keyboard navigation (arrow keys, shortcuts)
- [ ] Auto-load next officer after validation
- [ ] Bulk export to CSV
- [ ] Validation history (who validated when)
- [ ] Undo last validation
- [ ] Advanced filters (date range, probability range)
- [ ] PDF preview modal (instead of new tab)

### Not Needed
- ❌ Real-time subscriptions (single-user workflow)
- ❌ User authentication (add later if multi-user)
- ❌ Complex state management (URL + React Query is enough)
- ❌ Mobile optimization (desktop-focused tool)

---

## Success Criteria

### MVP is Complete When:
1. All 6 components built with SCSS modules
2. Officers load and filter correctly
3. Detail view displays all officer data
4. Citations show with working PDF links
5. Validation actions update database
6. Progress stats reflect changes
7. Dark theme applied throughout
8. No critical bugs

### Performance Targets
- Initial page load: < 2s
- Filter/search response: < 300ms
- Validation update: < 500ms
- Officer detail load: < 500ms

### Quality Checks
- TypeScript: No type errors
- Console: No errors or warnings
- Accessibility: Basic keyboard navigation works
- Browser: Works in Chrome, Safari, Firefox

---

## Environment Variables

**Required**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Optional**:
```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for server-side operations)
```

---

## Risk Mitigation

### Potential Issues

**1. JSONB Query Performance**
- Risk: Querying nested JSONB may be slow with large datasets
- Mitigation: Create GIN indexes on commonly queried JSONB paths
- SQL: `CREATE INDEX idx_validation_status ON officer_validations ((data->'validation'->>'status'));`

**2. Large Officer Lists**
- Risk: Loading 1000+ officers at once may be slow
- Mitigation: Implement pagination or virtual scrolling
- Solution: Start with limit of 100, add "Load More" button

**3. PDF Link Expiration**
- Risk: Azure Blob SAS URLs may expire
- Mitigation: Generate URLs server-side with fresh expiration
- Solution: Create API route to generate on-demand URLs

**4. Validation Conflicts**
- Risk: Multiple users validating same officer (future)
- Mitigation: Not needed for MVP (single-user)
- Future: Add optimistic locking or last-write-wins strategy

---

## Next Steps

1. Review this plan with stakeholders
2. Set up development environment
3. Begin Phase 1: Setup & Infrastructure
4. Build components incrementally
5. Test with real data as you go
6. Deploy to Vercel for feedback

---

## Questions for Future Consideration

- Will multiple users validate simultaneously?
- Do we need audit history of validation changes?
- Should we support bulk validation?
- Do we need to export validated results?
- Should validators be able to reassign officers to other validators?

(These can be addressed post-MVP)

---

**End of Plan**
