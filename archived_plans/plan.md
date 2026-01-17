# Officer Validation Dashboard - Comprehensive Build Plan

## 📋 Project Overview

Build a dashboard application for validating officer matches with the following features:
- **Left Sidebar**: Progress metrics, filters, and officer list
- **Main Content**: Detailed officer information for validation
- **Right Panel**: Validation actions (Confirm/Reject/Needs Review)
- **Real-time updates**: Validation status updates via Supabase

---

## 🎯 Core Requirements

### Functional Requirements
1. Display list of officers needing validation
2. Filter by validation status, case name, officer name
3. Show detailed officer information including:
   - Matched officer details
   - Employment history
   - Other officers with same name
   - Source document link
4. Allow validators to:
   - Mark matches as "Correct"
   - Mark matches as "Incorrect"
   - Mark matches as "Needs Review"
   - Add validation notes
5. Track validation progress (X of Y completed)
6. Export/download validation results

---

## 🏗️ Tech Stack

### Frontend Framework
- **Next.js 14+** (App Router)
  - Server-side rendering for initial data
  - Client components for interactive UI
  - API routes for server-side logic

### UI Components & Styling
- **shadcn/ui** - High-quality, accessible components
- **Tailwind CSS** - Utility-first CSS

### Data & State Management
- **Supabase Client** - Database + real-time subscriptions

### Deployment
- **Vercel** - Hosting and deployment


---

## 📁 Project Structure

# Officer Validations Data Structure

## Supabase Table: `officer_validations`

### Schema

```sql
officer_validations
├── id (UUID, primary key)
├── mention_uid (TEXT) - Extracted from data for indexing
├── provisional_case_name (TEXT) - Extracted from data for indexing
├── data (JSONB) - Full officer validation record
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### JSONB Data Structure (`data` column)

Each record in the `data` column contains:

```json
{
  "officer_info": {
    "mention_uid": "mention_12345",
    "provisional_case_name": "1740746809089-vzt",
    "document_link": "https://...",
    "matched_post_id": "B05-C48",
    "match_probability": 0.8052,
    "first_name": "MICHAEL",
    "middle_name": "JAMES",
    "last_name": "WEBB",
    "matched_agency": "SAN DIEGO POLICE DEPARTMENT",
    "mentioned_agencies": "None",
    "total_employment_stints": 4,
    "other_officers_summary": "10 unique officer(s), 16 total record(s)"
  },
  "other_officers_with_same_name": [
    {
      "post_person_nbr": "A25-D11",
      "post_first_name": "MICHAEL",
      "post_middle_name": "D",
      "post_last_name": "WEBB",
      "post_agency_name": "ANAHEIM POLICE DEPARTMENT",
      "post_start_date": "2010-01-15",
      "post_end_date": "2015-06-30"
    }
  ],
  "matched_officer_employment_history": [
    {
      "post_person_nbr": "B05-C48",
      "post_first_name": "MICHAEL",
      "post_middle_name": "JAMES",
      "post_last_name": "WEBB",
      "post_agency_name": "SAN DIEGO POLICE DEPARTMENT",
      "post_start_date": "1989-07-01",
      "post_end_date": "2016-10-15",
      "separation_reason": "Retired"
    }
  ],
  "validation": {
    "status": "pending",
    "validated_by": null,
    "validated_at": null,
    "notes": null
  },
  "citations": [
    {
      "file_name": "incident_report_2016.pdf",
      "file_id": "a1b2c3d4e5f6...",
      "page_number": 3,
      "quote": "Officer Michael Webb of San Diego PD responded...",
      "validator_reasoning": "Citation correctly links officer to agency",
      "agency_name": "SAN DIEGO POLICE DEPARTMENT",
      "blob_url": "https://...blob.core.windows.net/.../a1b2c3d4e5f6...?sv=...",
      "url_error": null
    }
  ],
  "citation_count": 1,
  "success": true,
  "error": null
}
```

## Common Queries

```sql
-- Get all pending validations
SELECT * FROM officer_validations 
WHERE data->'validation'->>'status' = 'pending';

-- Get officer by case name
SELECT * FROM officer_validations 
WHERE provisional_case_name = '1740746809089-vzt';

-- Get officers with no citations
SELECT * FROM officer_validations 
WHERE (data->>'citation_count')::int = 0;

-- Get officer by mention_uid
SELECT * FROM officer_validations 
WHERE mention_uid = '0012775cbeb5d1fc57d6c8283a436530e880ed6481b4ca92da8c3e214507bf18';

-- Update validation status
UPDATE officer_validations 
SET data = jsonb_set(data, '{validation,status}', '"correct"'),
    updated_at = NOW()
WHERE id = 'some-uuid';

-- Search citations for specific agency
SELECT * FROM officer_validations
WHERE data @> '{"citations": [{"agency_name": "SAN DIEGO POLICE DEPARTMENT"}]}';

-- Get officer name from JSONB
SELECT 
  id,
  data->'officer_info'->>'first_name' || ' ' || 
  COALESCE(data->'officer_info'->>'middle_name' || ' ', '') || 
  data->'officer_info'->>'last_name' AS officer_name,
  data->'officer_info'->>'matched_agency' AS agency,
  (data->>'citation_count')::int AS citations
FROM officer_validations
WHERE data->'validation'->>'status' = 'pending';
```

## Data Pipeline

1. **Excel → JSON** (`convert_excel_to_json.py`)
   - Parses matched officer data from Excel
   - Creates base structure with officer_info, employment history, validation fields

2. **JSON → Citations** (`extract_employing_agency.py`)
   - Searches case documents for citations linking officer to agency
   - Adds `citations`, `citation_count`, `success`, `error` fields

3. **Citations → URLs** (`enrich_with_urls.py`)
   - Generates Azure Blob SAS URLs for PDF viewing
   - Adds `blob_url` to each citation

4. **Upload → Supabase** (`upload_to_supabase.py`)
   - Uploads enriched records to `officer_validations` table
   - One row per officer, full record stored as JSONB
   - Input: `matched_clean_with_conflict_citations_with_urls.json` (JSON array format)

```
officer-validation-dashboard/
├── app/
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home/Dashboard page
│   ├── api/
│   │   └── validations/
│   │       ├── route.ts           # API routes for validations
│   │       └── [id]/route.ts      # Single validation endpoints
│   └── dashboard/
│       └── page.tsx               # Main dashboard view
├── components/
│   ├── ui/                        # shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   ├── dashboard/
│   │   ├── LeftSidebar.tsx        # Filters + officer list
│   │   ├── MainContent.tsx        # Officer details view
│   │   ├── RightPanel.tsx         # Validation actions
│   │   ├── ProgressStats.tsx      # Progress metrics
│   │   ├── OfficerList.tsx        # Scrollable list of officers
│   │   ├── OfficerCard.tsx        # Individual officer list item
│   │   ├── FilterPanel.tsx        # Filter controls
│   │   ├── EmploymentHistory.tsx  # Employment history table
│   │   ├── OtherOfficers.tsx      # Other officers with same name
│   │   └── ValidationActions.tsx  # Confirm/Reject buttons
│   └── shared/
│       ├── Header.tsx             # Top navigation
│       └── LoadingSpinner.tsx     # Loading states
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Supabase client (browser)
│   │   ├── server.ts              # Supabase client (server)
│   │   └── queries.ts             # Reusable queries
│   ├── utils.ts                   # Utility functions
│   └── types.ts                   # TypeScript types
├── hooks/
│   ├── useValidations.ts          # Fetch validations with filters
│   ├── useUpdateValidation.ts     # Update validation status
│   ├── useValidationStats.ts      # Get progress statistics
│   └── useRealtimeValidations.ts  # Real-time subscription
├── public/
└── .env.local                     # Environment variables
```

---

## 🚀 Implementation Plan

### Phase 1: Project Setup & Infrastructure (Day 1)

#### Step 1.1: Initialize Next.js Project
```bash
# Create Next.js app with TypeScript and Tailwind
npx create-next-app@latest officer-validation-dashboard \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd officer-validation-dashboard
```

#### Step 1.2: Install shadcn/ui
```bash
# Initialize shadcn/ui
npx shadcn@latest init

# When prompted, choose:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes

# Install core components
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add select
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add tabs
npx shadcn@latest add dropdown-menu
npx shadcn@latest add avatar
npx shadcn@latest add checkbox
npx shadcn@latest add label
```

#### Step 1.3: Install Dependencies
```bash
# Supabase
npm install @supabase/supabase-js

# React Query
npm install @tanstack/react-query @tanstack/react-query-devtools

# Form handling & validation
npm install react-hook-form zod @hookform/resolvers

# Date utilities
npm install date-fns

# Toast notifications
npm install sonner

# Icons (Lucide comes with shadcn, but install explicitly)
npm install lucide-react

# Optional: State management
npm install zustand
```

#### Step 1.4: Environment Variables
```bash
# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
```

#### Step 1.5: Supabase Client Setup
Create `lib/supabase/client.ts` and `lib/supabase/server.ts`

#### Step 1.6: TypeScript Types
Create `lib/types.ts` with database types:
```typescript
export interface OfficerValidation {
  id: string;
  mention_uid: string;
  provisional_case_name: string;
  document_link: string;
  matched_post_id: string;
  match_probability: number;
  mention_first_name: string;
  mention_middle_name: string;
  mention_last_name: string;
  // ... all other fields
}
```

---

### Phase 2: Core Components (Days 2-3)

#### Step 2.1: Left Sidebar Components
**Components to build:**
- `ProgressStats.tsx` - Shows validation progress (X/Y validated, success rate)
- `FilterPanel.tsx` - Filter controls (status, case name, officer name)
- `OfficerList.tsx` - Scrollable list of officers
- `OfficerCard.tsx` - Individual officer in list (name, match probability, status badge)

**Key Features:**
- Real-time progress updates
- Search/filter with debouncing
- Infinite scroll or pagination
- Active state for selected officer

#### Step 2.2: Main Content Components
**Components to build:**
- `MainContent.tsx` - Container for officer details
- `OfficerHeader.tsx` - Officer name, POST ID, match probability
- `EmploymentHistory.tsx` - Table of employment stints
- `OtherOfficers.tsx` - Table/cards of other officers with same name
- `DocumentPreview.tsx` - Link to source document + preview iframe (optional)

**Key Features:**
- Expandable sections
- Sortable tables
- Highlight differences between matched and other officers
- External document link with visual indicator

#### Step 2.3: Right Panel Components
**Components to build:**
- `ValidationActions.tsx` - Main validation buttons
- `ValidationNotesForm.tsx` - Textarea for notes
- `ValidationHistory.tsx` - Show who validated and when (if re-validating)

**Key Features:**
- Disabled state when no officer selected
- Confirmation dialogs for actions
- Success/error toast notifications
- Keyboard shortcuts (e.g., Cmd+Enter to confirm)

---

### Phase 3: Data Layer & Hooks (Day 3-4)

#### Step 3.1: Supabase Queries
Create `lib/supabase/queries.ts`:
```typescript
// Fetch validations with filters
export async function getValidations(filters: FilterOptions) { ... }

// Update validation status
export async function updateValidationStatus(id: string, data: UpdateData) { ... }

// Get statistics
export async function getValidationStats() { ... }
```

#### Step 3.2: React Query Hooks
Create hooks in `hooks/`:
```typescript
// useValidations.ts - Fetch validations with filters
export function useValidations(filters: FilterOptions) {
  return useQuery({
    queryKey: ['validations', filters],
    queryFn: () => getValidations(filters)
  })
}

// useUpdateValidation.ts - Update mutation
export function useUpdateValidation() {
  return useMutation({
    mutationFn: updateValidationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['validations'])
      toast.success('Validation updated')
    }
  })
}

// useValidationStats.ts - Get stats
export function useValidationStats() {
  return useQuery({
    queryKey: ['validation-stats'],
    queryFn: getValidationStats,
    refetchInterval: 30000 // Refresh every 30s
  })
}
```

#### Step 3.3: Real-time Subscriptions
Create `hooks/useRealtimeValidations.ts`:
```typescript
export function useRealtimeValidations() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const subscription = supabase
      .channel('validations-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'officer_match_validations' },
        (payload) => {
          // Invalidate queries to refetch
          queryClient.invalidateQueries(['validations'])
          queryClient.invalidateQueries(['validation-stats'])
        }
      )
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])
}
```

---

### Phase 4: Dashboard Assembly (Day 4-5)

#### Step 4.1: Main Dashboard Layout
Create `app/dashboard/page.tsx`:
```typescript
export default function DashboardPage() {
  return (
    <div className="flex h-screen">
      <LeftSidebar />
      <MainContent />
      <RightPanel />
    </div>
  )
}
```

#### Step 4.2: State Management
Use URL state for:
- Selected officer ID
- Filter parameters
- Sort order

Example using Next.js searchParams:
```typescript
const searchParams = useSearchParams()
const selectedOfficerId = searchParams.get('officer')
const statusFilter = searchParams.get('status')
```

#### Step 4.3: Keyboard Navigation
Add keyboard shortcuts:
- `↑/↓` - Navigate officer list
- `Enter` - Select officer
- `c` - Mark as Correct
- `r` - Mark as Incorrect
- `n` - Mark as Needs Review
- `/` - Focus search

---

### Phase 5: Polish & Features (Day 5-6)

#### Step 5.1: Loading & Error States
- Skeleton loaders for tables
- Empty states with helpful messages
- Error boundaries
- Retry mechanisms

#### Step 5.2: Export Functionality
- Export validated results to CSV
- Export pending validations
- Download full report

#### Step 5.3: Accessibility
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader announcements

#### Step 5.4: Performance Optimization
- Virtualized lists for large datasets
- Memoization for expensive computations
- Lazy loading for document previews
- Optimistic updates

---

### Phase 6: Deployment (Day 6)

#### Step 6.1: Set up Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

#### Step 6.2: Configure Vercel Project
- Set up production environment
- Configure custom domain (optional)
- Enable analytics
- Set up deployment notifications

#### Step 6.3: Post-Deployment
- Test all features in production
- Monitor performance with Vercel Analytics
- Set up error tracking (Sentry optional)

---

## 🎨 UI/UX Design Specifications

### Layout Dimensions
```
┌─────────────────────────────────────────────────────────────┐
│                     Header (h-16)                           │
├──────────┬────────────────────────────────┬─────────────────┤
│          │                                │                 │
│   Left   │        Main Content            │  Right Panel    │
│  Sidebar │                                │                 │
│  (w-80)  │         (flex-1)               │    (w-96)       │
│          │                                │                 │
│  Stats   │  Officer Details               │  Actions        │
│  Filters │  - Header                      │  - Confirm      │
│  List    │  - Employment History          │  - Reject       │
│          │  - Other Officers              │  - Review       │
│          │  - Document Link               │  - Notes        │
│          │                                │                 │
└──────────┴────────────────────────────────┴─────────────────┘
```

### Color Scheme
- **Pending**: Yellow/Amber
- **Correct**: Green
- **Incorrect**: Red
- **Needs Review**: Blue/Purple
- **Background**: Slate-50
- **Sidebar**: White with border
- **Accent**: Your brand color

### Typography
- **Headings**: Font-semibold
- **Body**: Font-normal
- **Monospace**: For IDs, dates

---

## 🔧 Key Component Details

### Left Sidebar - ProgressStats
```typescript
interface ProgressStats {
  total: number
  validated: number
  pending: number
  correct: number
  incorrect: number
  needsReview: number
  successRate: number // correct / (correct + incorrect)
}
```

Display as:
- Progress bar (validated / total)
- Stat cards for each status
- Success rate percentage

### Left Sidebar - FilterPanel
```typescript
interface FilterOptions {
  status?: 'pending' | 'correct' | 'incorrect' | 'needs_review'
  search?: string // Search officer name
  caseName?: string
  sortBy?: 'probability' | 'name' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}
```

### Main Content - EmploymentHistory
Table with columns:
- Agency Name
- Start Date
- End Date
- Duration (calculated)
- Separation Reason (if available)

Highlight the matched stint if available.

### Main Content - OtherOfficers
For each other officer:
- Name (First Middle Last)
- POST ID
- Employment history (condensed)
- Visual diff from matched officer

Show warning if:
- Same name but different middle initial
- Different agencies but overlapping dates
- Similar but not identical employment history

### Right Panel - ValidationActions
Three main buttons:
1. **Confirm Match** (Green) - Mark as correct
2. **Reject Match** (Red) - Mark as incorrect
3. **Needs Review** (Yellow) - Flag for human review

Each action:
- Opens confirmation dialog
- Allows adding notes
- Shows toast on success
- Updates UI optimistically

---

## 📊 Data Flow

```
User Action (Click Confirm)
    ↓
ValidationActions component
    ↓
useUpdateValidation hook
    ↓
React Query mutation
    ↓
Supabase update query
    ↓
Database updated
    ↓
Supabase real-time subscription fires
    ↓
All clients invalidate queries
    ↓
UI re-renders with new data
    ↓
Toast notification shows success
```

---

## 🧪 Testing Plan

### Unit Tests
- Component rendering
- Hook logic
- Utility functions

### Integration Tests
- Full validation flow
- Filter interactions
- Real-time updates

### E2E Tests (Playwright)
- Complete validation workflow
- Keyboard navigation
- Export functionality

---

## 📝 Documentation Needs

1. **README.md** - Setup instructions
2. **CONTRIBUTING.md** - Development guidelines
3. **API.md** - Supabase queries documentation
4. **COMPONENTS.md** - Component API documentation

---

## ⚡ Performance Targets

- **Initial Load**: < 2s
- **Filter/Search**: < 100ms
- **Validation Update**: < 500ms
- **Real-time Update**: < 1s
- **Lighthouse Score**: > 90

---

## 🔐 Security Considerations

1. **Row Level Security (RLS)** on Supabase
   - Users can only see validations they're assigned to (optional)
   - All users can read, only authenticated users can update

2. **Authentication**
   - Supabase Auth (email/password or OAuth)
   - Protected routes

3. **Data Validation**
   - Zod schemas for all inputs
   - Server-side validation

---

## 🎯 Success Metrics

- **Validation Speed**: Average time to validate one officer
- **Accuracy**: Percentage of correct validations
- **User Satisfaction**: Feedback from validators
- **System Uptime**: 99.9% availability

---

## 📦 Deliverables Checklist

- [ ] Next.js project initialized
- [ ] shadcn/ui components installed
- [ ] Supabase client configured
- [ ] TypeScript types defined
- [ ] Left sidebar (filters + list) complete
- [ ] Main content (officer details) complete
- [ ] Right panel (validation actions) complete
- [ ] Real-time updates working
- [ ] Export functionality
- [ ] Deployed to Vercel
- [ ] Documentation written
- [ ] Tests passing

---

## 🚧 Future Enhancements (Post-MVP)

1. **Bulk Operations**
   - Select multiple officers
   - Batch approve/reject

2. **Advanced Filtering**
   - Date range filters
   - Match probability thresholds
   - County/region filters

3. **Analytics Dashboard**
   - Validation trends over time
   - Validator performance metrics
   - Common rejection reasons

4. **Collaborative Features**
   - Comments on validations
   - Tag other validators
   - Revision history

5. **AI Suggestions**
   - Auto-suggest validation based on patterns
   - Highlight suspicious matches
   - Confidence scoring

---

## 📞 Support & Maintenance

- **Bug Reports**: GitHub Issues
- **Feature Requests**: GitHub Discussions
- **Documentation**: Deployed on Vercel + GitHub Wiki
- **Monitoring**: Vercel Analytics + Supabase Dashboard

---

## ✅ Ready to Build!

Start with Phase 1 and work sequentially. Each phase builds on the previous one.

**Estimated Timeline**: 6 days for MVP
**Team Size**: 1-2 developers
**Skills Required**: React, Next.js, TypeScript, Supabase, Tailwind CSS