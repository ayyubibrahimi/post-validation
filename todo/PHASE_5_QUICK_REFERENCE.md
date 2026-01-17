# Phase 5: Validation Flow - Quick Reference

## What Was Built

Phase 5 wired up all components into a complete validation workflow with toast notifications, URL state management, and end-to-end user flows.

## Files Created

```
app/
├── dashboard/
│   ├── page.tsx              # Main dashboard page (NEW)
│   └── page.module.scss      # Dashboard layout styles (NEW)
└── page.tsx                  # Modified to redirect to /dashboard
```

## Files Modified

```
app/
└── layout.tsx                # Added Sonner Toaster component
```

## Component Integration

### Dashboard Page (`/app/dashboard/page.tsx`)

Main orchestrator that brings everything together:

```tsx
import DashboardLayout from '@/components/DashboardLayout';
import ProgressStats from '@/components/ProgressStats';
import QueueStatus from '@/components/QueueStatus';
import OfficerDetail from '@/components/OfficerDetail';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentOfficerUid = searchParams.get('officer');
  const validatorId = 'validator_001'; // Hardcoded for MVP

  return (
    <DashboardLayout>
      <div className="leftColumn">
        <ProgressStats />
        <QueueStatus
          validatorId={validatorId}
          onOfficerClaimed={handleOfficerClaimed}
          onOfficerReleased={handleOfficerReleased}
        />
      </div>
      <div className="rightColumn">
        <OfficerDetail
          mentionUid={currentOfficerUid}
          validatorId={validatorId}
          onValidationComplete={handleValidationComplete}
        />
      </div>
    </DashboardLayout>
  );
}
```

## User Workflows

### 1. Claim Officer Flow

```
User Action: Click "Get Next Officer"
    ↓
QueueStatus → useClaimOfficer.mutate()
    ↓
API: POST /api/officers/claim
    ↓
Database: Atomic claim (being_reviewed_by = validator_id)
    ↓
Success Callback: onOfficerClaimed(mentionUid)
    ↓
Dashboard: router.push(`/dashboard?officer=${mentionUid}`)
    ↓
Toast: "Officer claimed successfully"
    ↓
OfficerDetail: Renders with useOfficerDetail(mentionUid)
    ↓
Stats & Queue: Auto-refresh via polling
```

### 2. Validate Officer Flow

```
User Action: Click Confirm/Reject/Needs Review
    ↓
OfficerDetail: Show confirmation dialog
    ↓
User Action: Confirm validation
    ↓
OfficerDetail → useValidateOfficer.mutate()
    ↓
API: POST /api/officers/validate
    ↓
Database: Update status, clear lock
    ↓
Success Callback: onValidationComplete()
    ↓
Dashboard: router.push('/dashboard')
    ↓
Toast: "Validation saved successfully"
    ↓
OfficerDetail: Shows empty state
    ↓
Stats & Queue: Auto-refresh via polling
```

### 3. Release Officer Flow

```
User Action: Click "Release Current Officer"
    ↓
QueueStatus: Native confirm dialog
    ↓
User Action: Confirm release
    ↓
QueueStatus → useReleaseOfficer.mutate()
    ↓
API: POST /api/officers/release
    ↓
Database: Clear lock, status = 'pending'
    ↓
Success Callback: onOfficerReleased()
    ↓
Dashboard: router.push('/dashboard')
    ↓
Toast: "Officer released"
    ↓
Queue: Auto-refresh via polling
```

## Toast Notification Patterns

### Success Toasts

```tsx
// Officer claimed
toast.success('Officer claimed successfully', {
  description: 'You can now review and validate this officer',
});

// Validation saved
toast.success('Validation saved successfully', {
  description: 'The officer has been validated and released',
});
```

### Info Toasts

```tsx
// Officer released
toast.info('Officer released', {
  description: 'The officer has been returned to the queue',
});
```

### Error Messages (in components)

```tsx
// No officers available
setClaimError('No officers available for review');

// Network error
setClaimError(error.message);
```

## URL State Management

### Reading URL Params

```tsx
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const currentOfficerUid = searchParams.get('officer'); // null or mention_uid
```

### Updating URL

```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

// Add officer param
const params = new URLSearchParams(searchParams.toString());
params.set('officer', mentionUid);
router.push(`/dashboard?${params.toString()}`);

// Clear all params
router.push('/dashboard');
```

## Callback Props Pattern

### Dashboard (Parent)

```tsx
const handleOfficerClaimed = (mentionUid: string) => {
  // Update URL
  router.push(`/dashboard?officer=${mentionUid}`);
  // Show toast
  toast.success('Officer claimed successfully');
};

<QueueStatus onOfficerClaimed={handleOfficerClaimed} />
```

### QueueStatus (Child)

```tsx
interface QueueStatusProps {
  onOfficerClaimed?: (mentionUid: string) => void;
}

const handleClaimOfficer = () => {
  claimOfficer.mutate({ validatorId }, {
    onSuccess: (data) => {
      if (data.officer) {
        onOfficerClaimed?.(data.officer.mention_uid);
      }
    },
  });
};
```

## Component Communication Flow

```
Dashboard (State Owner)
├── URL State (searchParams, router)
├── Toast Functions (toast.success, toast.info)
└── Callbacks
    ├── handleOfficerClaimed(mentionUid)
    ├── handleOfficerReleased()
    └── handleValidationComplete()

Components (Props Receivers)
├── ProgressStats
│   └── No props (self-contained with hooks)
├── QueueStatus
│   ├── Props: validatorId, onOfficerClaimed, onOfficerReleased
│   └── Hooks: useQueueStatus, useClaimOfficer, useReleaseOfficer
└── OfficerDetail
    ├── Props: mentionUid, validatorId, onValidationComplete
    └── Hooks: useOfficerDetail, useValidateOfficer
```

## Polling & Refresh Strategy

### Auto-Polling (React Query)

```tsx
// Stats: every 30 seconds
useValidationStats() // in ProgressStats

// Queue: every 10 seconds
useQueueStatus(validatorId) // in QueueStatus
```

### Query Invalidation (on mutations)

```tsx
// After claim
queryClient.invalidateQueries(['validation-stats']);
queryClient.invalidateQueries(['queue-status', validatorId]);

// After validate
queryClient.invalidateQueries(['validation-stats']);
queryClient.invalidateQueries(['queue-status', validatorId]);
queryClient.invalidateQueries(['officer-detail', mentionUid]);

// After release
queryClient.invalidateQueries(['queue-status', validatorId]);
```

## Testing Checklist

### Basic Flow
- [ ] Landing on `/` redirects to `/dashboard`
- [ ] Dashboard loads with stats and queue
- [ ] "Get Next Officer" enabled when not reviewing
- [ ] Clicking "Get Next Officer" updates URL
- [ ] OfficerDetail renders when URL has officer param
- [ ] Validation buttons trigger confirmation dialog
- [ ] Confirming validation clears URL and shows toast
- [ ] Stats and queue update after validation

### Edge Cases
- [ ] No officers available shows message
- [ ] "Get Next Officer" disabled when reviewing
- [ ] Release officer clears URL
- [ ] Network errors show error messages
- [ ] Loading states work correctly

### URL State
- [ ] URL updates when officer claimed
- [ ] URL clears when validation complete
- [ ] URL clears when officer released
- [ ] Refresh maintains state
- [ ] Browser back button works

### Toast Notifications
- [ ] Success toast on claim
- [ ] Success toast on validation
- [ ] Info toast on release
- [ ] Toasts auto-dismiss

## Common Issues & Solutions

### Issue: URL doesn't update after claim

**Cause**: Not calling `onOfficerClaimed` callback
**Solution**: Ensure callback is called in success handler:
```tsx
claimOfficer.mutate({ validatorId }, {
  onSuccess: (data) => {
    if (data.officer) {
      onOfficerClaimed?.(data.officer.mention_uid); // ← Must call this
    }
  },
});
```

### Issue: Toast doesn't appear

**Cause**: Toaster not added to layout
**Solution**: Ensure `<Toaster />` is in root layout:
```tsx
<Providers>
  {children}
  <Toaster position="top-right" richColors />
</Providers>
```

### Issue: OfficerDetail shows empty state when URL has officer

**Cause**: useOfficerDetail not receiving mentionUid
**Solution**: Check searchParams is being read correctly:
```tsx
const currentOfficerUid = searchParams.get('officer');
<OfficerDetail mentionUid={currentOfficerUid} />
```

### Issue: Stats don't update after validation

**Cause**: Query invalidation not working
**Solution**: Check React Query setup in hooks (Phase 3)

## Key Files Reference

| File | Purpose | Key Features |
|------|---------|--------------|
| `app/dashboard/page.tsx` | Main dashboard | URL state, callbacks, layout |
| `app/layout.tsx` | Root layout | Toaster component |
| `app/page.tsx` | Root page | Redirect to dashboard |
| `components/QueueStatus.tsx` | Queue controls | Claim, release actions |
| `components/OfficerDetail.tsx` | Officer review | Validation, confirmation dialog |
| `components/ProgressStats.tsx` | Stats display | Auto-polling metrics |

## Next Steps (Phase 6)

1. Add loading skeletons for better UX
2. Add smooth transitions and animations
3. Improve error boundaries
4. Add keyboard shortcuts
5. Test accessibility
6. Performance optimization
7. Cross-browser testing
8. Mobile responsiveness check

## Environment Variables

No new environment variables required. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Validator ID

Currently hardcoded as `"validator_001"` in dashboard page.

**To change**: Edit `app/dashboard/page.tsx`:
```tsx
const validatorId = 'validator_001'; // ← Change this
```

**Future**: Replace with session-based ID from auth provider
