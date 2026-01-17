# Phase 4 Quick Reference - Core Components

**Status**: ✅ COMPLETE
**Date**: January 17, 2026

---

## Components Created

### 1. DashboardLayout
```typescript
import { DashboardLayout } from '@/components';

<DashboardLayout>
  <div className="left-column">
    {/* 340px fixed width */}
  </div>
  <div className="right-column">
    {/* Flex 1 - fills remaining */}
  </div>
</DashboardLayout>
```

**Files**: `DashboardLayout.tsx`, `DashboardLayout.module.scss`

---

### 2. ProgressStats
```typescript
import { ProgressStats } from '@/components';

<ProgressStats />
```

**Hook**: `useValidationStats()` (auto-polls every 30s)

**Displays**:
- Total officers & validated count
- Completion percentage with progress bar
- Status breakdown (Correct/Incorrect/Needs Review)
- Success rate

**Files**: `ProgressStats.tsx`, `ProgressStats.module.scss`

---

### 3. QueueStatus
```typescript
import { QueueStatus } from '@/components';

<QueueStatus
  validatorId="user_123"
  onOfficerClaimed={(mentionUid) => console.log('Claimed:', mentionUid)}
  onOfficerReleased={() => console.log('Released')}
/>
```

**Hooks**:
- `useQueueStatus(validatorId)` (auto-polls every 10s)
- `useClaimOfficer()`
- `useReleaseOfficer()`

**Displays**:
- Available & in-review counts
- Currently reviewing officer (if any)
- Time elapsed
- Action buttons (Get Next/Release)

**Files**: `QueueStatus.tsx`, `QueueStatus.module.scss`

---

### 4. CitationCard
```typescript
import { CitationCard } from '@/components';

<CitationCard citation={citation} />
```

**Props**: `citation: Citation`

**Displays**:
- Quote with highlighted agency name
- File name & page number
- Agency badge
- PDF link (opens new tab)

**Files**: `CitationCard.tsx`, `CitationCard.module.scss`

---

### 5. OfficerDetail
```typescript
import { OfficerDetail } from '@/components';

<OfficerDetail
  mentionUid={mentionUid || null}
  validatorId="user_123"
  onValidationComplete={() => console.log('Validated!')}
/>
```

**Hooks**:
- `useOfficerDetail(mentionUid)`
- `useValidateOfficer()`

**Sections**:
1. Header (officer info, match probability)
2. Employment comparison (matched vs others)
3. Citations list
4. Validation actions (Confirm/Reject/Review)

**Features**:
- Empty state when no officer
- Loading state
- Confirmation dialog
- Notes textarea

**Files**: `OfficerDetail.tsx`, `OfficerDetail.module.scss`

---

## Import All Components

```typescript
import {
  DashboardLayout,
  ProgressStats,
  QueueStatus,
  OfficerDetail,
  CitationCard,
} from '@/components';
```

---

## File Locations

```
/components/
├── index.ts                      # Export barrel
├── DashboardLayout.tsx
├── DashboardLayout.module.scss
├── ProgressStats.tsx
├── ProgressStats.module.scss
├── QueueStatus.tsx
├── QueueStatus.module.scss
├── CitationCard.tsx
├── CitationCard.module.scss
├── OfficerDetail.tsx
└── OfficerDetail.module.scss
```

---

## Typical Dashboard Structure

```tsx
import {
  DashboardLayout,
  ProgressStats,
  QueueStatus,
  OfficerDetail,
} from '@/components';

export default function DashboardPage() {
  const [mentionUid, setMentionUid] = useState<string | null>(null);
  const validatorId = 'user_123'; // Get from session

  return (
    <DashboardLayout>
      {/* Left Column */}
      <div className="left-column">
        <ProgressStats />
        <QueueStatus
          validatorId={validatorId}
          onOfficerClaimed={setMentionUid}
          onOfficerReleased={() => setMentionUid(null)}
        />
      </div>

      {/* Right Column */}
      <div className="right-column">
        <OfficerDetail
          mentionUid={mentionUid}
          validatorId={validatorId}
          onValidationComplete={() => setMentionUid(null)}
        />
      </div>
    </DashboardLayout>
  );
}
```

---

## Color-Coded Elements

### Match Probability
- **Green** (>85%): High confidence match
- **Amber** (70-85%): Medium confidence
- **Red** (<70%): Low confidence

### Status Colors
- **Green**: Correct
- **Red**: Incorrect
- **Blue**: Needs Review
- **Purple**: Being Reviewed
- **Amber**: Pending

### Action Buttons
- **Green**: Confirm Match
- **Red**: Reject Match
- **Yellow**: Needs Review
- **Teal**: Primary actions (Get Next Officer)

---

## Icons Used (lucide-react)

- `CheckCircle` - Correct status
- `XCircle` - Incorrect status
- `Eye` - Needs review
- `Loader2` - Loading spinners
- `Clock` - Timer
- `Lock` - Lock indicator
- `ArrowRight` - Next action
- `AlertCircle` - Errors
- `AlertTriangle` - Warnings
- `ExternalLink` - PDF links
- `FileText` - File metadata

---

## CSS Variables Reference

```scss
// Import in SCSS modules
@import '../app/variables.scss';

// Use variables
background-color: var(--bg-primary);
color: var(--text-primary);
border: 1px solid var(--border-subtle);
```

**Key Variables**:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`
- `--text-primary`, `--text-secondary`, `--text-muted`
- `--border-subtle`, `--border-medium`
- `--accent-primary`, `--accent-hover`
- `--status-correct`, `--status-incorrect`, `--status-review`
- `--success`, `--warning`, `--error`
- `--spacing-xs` through `--spacing-2xl`
- `--radius-sm`, `--radius-md`, `--radius-lg`
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`

---

## Next Steps

**Phase 5**: Validation Flow
1. Create `/app/dashboard/page.tsx`
2. Wire up all components
3. Add toast notifications (Sonner)
4. Implement URL state management
5. Test full workflow

---

## Documentation

- **Detailed Summary**: `/todo/phase-4-summary.md`
- **Plan Reference**: `/plans/2026-01-17-officer-validation-simplified.md`
- **Hooks Reference**: `/hooks/README.md`
- **Types Reference**: `/lib/types.ts`
