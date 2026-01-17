# Phase 3: Quick Reference Guide

## Import All Hooks
```typescript
import {
  // Mutations
  useClaimOfficer,
  useValidateOfficer,
  useReleaseOfficer,
  // Queries
  useOfficerDetail,
  useValidationStats,
  useQueueStatus
} from '@/hooks';
```

---

## Hook Reference Card

### 🔄 useClaimOfficer()
```typescript
const claimOfficer = useClaimOfficer();
claimOfficer.mutate({ validatorId: 'user_123' });
```
- **Type**: Mutation
- **Endpoint**: POST `/api/officers/claim`
- **Returns**: `{ officer: OfficerValidation | null }`
- **Invalidates**: stats, queue

---

### ✅ useValidateOfficer()
```typescript
const validateOfficer = useValidateOfficer();
validateOfficer.mutate({
  mentionUid: 'mention_123',
  validatorId: 'user_123',
  status: 'correct', // 'correct' | 'incorrect' | 'needs_review'
  notes: 'Optional notes'
});
```
- **Type**: Mutation
- **Endpoint**: POST `/api/officers/validate`
- **Invalidates**: stats, queue, officer

---

### 🔓 useReleaseOfficer()
```typescript
const releaseOfficer = useReleaseOfficer();
releaseOfficer.mutate({
  mentionUid: 'mention_123',
  validatorId: 'user_123'
});
```
- **Type**: Mutation
- **Endpoint**: POST `/api/officers/release`
- **Invalidates**: stats, queue
- **Removes**: officer from cache

---

### 👤 useOfficerDetail(mentionUid)
```typescript
const { data: officer, isLoading } = useOfficerDetail(mentionUid);
```
- **Type**: Query
- **Source**: React Query cache (set by useClaimOfficer)
- **Returns**: `OfficerValidation | null`
- **Polling**: None

---

### 📊 useValidationStats()
```typescript
const { data: stats, isLoading } = useValidationStats();
// stats: { total, validated, correct, incorrect, needsReview, successRate }
```
- **Type**: Query
- **Endpoint**: GET `/api/officers/stats`
- **Polling**: Every 30 seconds
- **Auto-refresh**: Window focus, mount

---

### 📋 useQueueStatus(validatorId)
```typescript
const { data: queue, isLoading } = useQueueStatus(validatorId);
// queue: { available, inReview, yourOfficer }
```
- **Type**: Query
- **Endpoint**: GET `/api/officers/queue`
- **Polling**: Every 10 seconds
- **Auto-refresh**: Window focus, mount

---

## Complete Workflow

```typescript
function Dashboard() {
  const validatorId = 'user_123';
  const [currentOfficerId, setCurrentOfficerId] = useState<string | null>(null);

  // Initialize hooks
  const claimOfficer = useClaimOfficer();
  const validateOfficer = useValidateOfficer();
  const releaseOfficer = useReleaseOfficer();
  const { data: officer } = useOfficerDetail(currentOfficerId);
  const { data: stats } = useValidationStats();
  const { data: queue } = useQueueStatus(validatorId);

  // 1. Claim next officer
  const handleClaim = () => {
    claimOfficer.mutate({ validatorId }, {
      onSuccess: (data) => {
        if (data.officer) setCurrentOfficerId(data.officer.mention_uid);
      }
    });
  };

  // 2. Validate officer
  const handleValidate = (status: 'correct' | 'incorrect' | 'needs_review') => {
    if (!officer) return;
    validateOfficer.mutate({
      mentionUid: officer.mention_uid,
      validatorId,
      status,
      notes: ''
    }, {
      onSuccess: () => setCurrentOfficerId(null)
    });
  };

  // 3. Release officer
  const handleRelease = () => {
    if (!officer) return;
    releaseOfficer.mutate({
      mentionUid: officer.mention_uid,
      validatorId
    }, {
      onSuccess: () => setCurrentOfficerId(null)
    });
  };

  return (
    <div>
      {/* Stats (auto-updates every 30s) */}
      {stats && <ProgressStats stats={stats} />}

      {/* Queue (auto-updates every 10s) */}
      {queue && (
        <QueueStatus
          queue={queue}
          onClaim={handleClaim}
          onRelease={handleRelease}
        />
      )}

      {/* Officer Detail */}
      {officer && (
        <OfficerDetail
          officer={officer}
          onValidate={handleValidate}
        />
      )}
    </div>
  );
}
```

---

## States & Properties

### Mutation States
```typescript
{
  isPending: boolean,    // Is mutation in progress?
  isError: boolean,      // Did mutation fail?
  error: Error | null,   // Error object if failed
  data: Response | undefined  // Response data if successful
}
```

### Query States
```typescript
{
  isLoading: boolean,    // Is initial fetch in progress?
  isError: boolean,      // Did query fail?
  error: Error | null,   // Error object if failed
  data: Data | undefined // Query data if successful
}
```

---

## Query Keys

```typescript
['validationStats']              // Global stats
['queueStatus', validatorId]     // Per-validator queue
['officerDetail', mentionUid]    // Individual officer
```

---

## Polling Schedule

| Hook | Interval | Purpose |
|------|----------|---------|
| useValidationStats | 30s | Real-time progress updates |
| useQueueStatus | 10s | Timer accuracy & queue counts |
| useOfficerDetail | None | Static data once claimed |

---

## Error Handling Pattern

```typescript
const { data, isLoading, isError, error } = useValidationStats();

if (isLoading) {
  return <Spinner />;
}

if (isError) {
  return <ErrorMessage message={error.message} />;
}

if (!data) {
  return <EmptyState />;
}

return <DataDisplay data={data} />;
```

---

## Mutation Pattern

```typescript
const mutation = useClaimOfficer();

const handleClick = () => {
  mutation.mutate(
    { validatorId: 'user_123' },
    {
      onSuccess: (data) => {
        console.log('Success!', data);
      },
      onError: (error) => {
        console.error('Error:', error.message);
      }
    }
  );
};

return (
  <button
    onClick={handleClick}
    disabled={mutation.isPending}
  >
    {mutation.isPending ? 'Loading...' : 'Claim Officer'}
  </button>
);
```

---

## Files Structure

```
hooks/
├── index.ts                 # Barrel exports
├── useClaimOfficer.ts       # 72 lines
├── useValidateOfficer.ts    # 79 lines
├── useReleaseOfficer.ts     # 72 lines
├── useOfficerDetail.ts      # 55 lines
├── useValidationStats.ts    # 50 lines
├── useQueueStatus.ts        # 59 lines
└── README.md                # Complete documentation
```

---

## Documentation

- **Usage Guide**: `hooks/README.md`
- **Implementation**: `todo/phase-3-summary.md`
- **Checklist**: `todo/phase-3-checklist.md`
- **Deliverable**: `PHASE_3_DELIVERABLE.md`
- **Quick Ref**: `PHASE_3_QUICK_REFERENCE.md` (this file)

---

## Next: Phase 4 Components

Ready to build:
1. DashboardLayout
2. ProgressStats (uses `useValidationStats`)
3. QueueStatus (uses `useQueueStatus`, `useClaimOfficer`, `useReleaseOfficer`)
4. OfficerDetail (uses `useOfficerDetail`, `useValidateOfficer`)
5. CitationCard

All hooks ready for integration! 🚀
