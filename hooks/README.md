# React Query Hooks for Officer Validation Dashboard

This directory contains all React Query hooks for the Officer Validation Dashboard. These hooks provide type-safe, cached access to API endpoints with automatic refetching, loading states, and error handling.

## Installation

No additional installation needed. These hooks use:
- `@tanstack/react-query` (installed in Phase 1)
- Types from `@/lib/types` (created in Phase 1)

## Available Hooks

### Mutation Hooks

#### useClaimOfficer()
Claims the next available officer for validation.

```typescript
import { useClaimOfficer } from '@/hooks';

const claimOfficer = useClaimOfficer();

claimOfficer.mutate(
  { validatorId: 'user_123' },
  {
    onSuccess: (data) => {
      if (data.officer) {
        console.log('Claimed:', data.officer.mention_uid);
      } else {
        console.log('No officers available');
      }
    }
  }
);
```

**Returns:**
- `officer` - Full officer record with JSONB data
- `null` - If no officers available

**Invalidates:** `validationStats`, `queueStatus`

---

#### useValidateOfficer()
Validates an officer (correct/incorrect/needs_review).

```typescript
import { useValidateOfficer } from '@/hooks';

const validateOfficer = useValidateOfficer();

validateOfficer.mutate({
  mentionUid: 'mention_123',
  validatorId: 'user_123',
  status: 'correct',
  notes: 'Employment dates match all citations'
});
```

**Invalidates:** `validationStats`, `queueStatus`, `officerDetail`

---

#### useReleaseOfficer()
Releases an officer without validation.

```typescript
import { useReleaseOfficer } from '@/hooks';

const releaseOfficer = useReleaseOfficer();

releaseOfficer.mutate({
  mentionUid: 'mention_123',
  validatorId: 'user_123'
});
```

**Invalidates:** `validationStats`, `queueStatus`
**Removes:** Officer from cache

---

### Query Hooks

#### useOfficerDetail(mentionUid)
Retrieves claimed officer's full data from cache.

```typescript
import { useOfficerDetail } from '@/hooks';

const { data: officer, isLoading } = useOfficerDetail(mentionUid);

if (isLoading || !officer) return <div>Loading...</div>;

return <OfficerDetail officer={officer} />;
```

**Data Source:** React Query cache (set by `useClaimOfficer`)
**Refetching:** None (static data once claimed)

---

#### useValidationStats()
Fetches validation statistics with 30-second polling.

```typescript
import { useValidationStats } from '@/hooks';

const { data: stats, isLoading, error } = useValidationStats();

if (isLoading) return <div>Loading...</div>;
if (error) return <div>Error: {error.message}</div>;

return (
  <div>
    <p>Total: {stats.total}</p>
    <p>Validated: {stats.validated}</p>
    <p>Success Rate: {(stats.successRate * 100).toFixed(1)}%</p>
  </div>
);
```

**Polling:** Every 30 seconds
**Refetch on:** Window focus, mount

---

#### useQueueStatus(validatorId)
Fetches queue status with 10-second polling.

```typescript
import { useQueueStatus } from '@/hooks';

const { data: queue, isLoading } = useQueueStatus(validatorId);

if (isLoading || !queue) return <div>Loading...</div>;

return (
  <div>
    <p>Available: {queue.available}</p>
    <p>In Review: {queue.inReview}</p>
    {queue.yourOfficer && (
      <p>Reviewing for: {queue.yourOfficer.time_elapsed_minutes} min</p>
    )}
  </div>
);
```

**Polling:** Every 10 seconds
**Refetch on:** Window focus, mount

---

## Query Keys

```typescript
['validationStats']                  // Global stats
['queueStatus', validatorId]         // Per-validator queue
['officerDetail', mentionUid]        // Individual officer
```

## Invalidation Flow

```
useClaimOfficer
    ↓
Invalidates: validationStats, queueStatus
Caches: officerDetail

useValidateOfficer
    ↓
Invalidates: validationStats, queueStatus, officerDetail
Updates: All related data

useReleaseOfficer
    ↓
Invalidates: validationStats, queueStatus
Removes: officerDetail
```

## Error Handling

All hooks provide:
- `isLoading` / `isPending` - Loading state
- `isError` - Error state
- `error` - Error object with message
- Console logging for debugging

Example:
```typescript
const { data, isLoading, isError, error } = useValidationStats();

if (isLoading) return <Spinner />;
if (isError) return <ErrorMessage error={error} />;
if (!data) return null;

return <StatsDisplay stats={data} />;
```

## Complete Workflow Example

```typescript
import {
  useClaimOfficer,
  useOfficerDetail,
  useValidateOfficer,
  useValidationStats,
  useQueueStatus
} from '@/hooks';

function Dashboard() {
  const validatorId = 'user_123';
  const [currentOfficerId, setCurrentOfficerId] = useState<string | null>(null);

  // Hooks
  const claimOfficer = useClaimOfficer();
  const validateOfficer = useValidateOfficer();
  const { data: officer } = useOfficerDetail(currentOfficerId);
  const { data: stats } = useValidationStats();
  const { data: queue } = useQueueStatus(validatorId);

  // Handlers
  const handleClaim = () => {
    claimOfficer.mutate(
      { validatorId },
      {
        onSuccess: (data) => {
          if (data.officer) {
            setCurrentOfficerId(data.officer.mention_uid);
          }
        }
      }
    );
  };

  const handleValidate = (status: 'correct' | 'incorrect' | 'needs_review') => {
    if (!officer) return;

    validateOfficer.mutate(
      {
        mentionUid: officer.mention_uid,
        validatorId,
        status,
        notes: ''
      },
      {
        onSuccess: () => {
          setCurrentOfficerId(null); // Clear current officer
          toast.success('Validation saved!');
        }
      }
    );
  };

  return (
    <div>
      <ProgressStats stats={stats} />
      <QueueStatus queue={queue} onClaim={handleClaim} />
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

## TypeScript Support

All hooks are fully typed using types from `@/lib/types`:

```typescript
type ClaimOfficerRequest = { validatorId: string };
type ClaimOfficerResponse = { success: boolean; officer: OfficerValidation | null };
type ValidateOfficerRequest = { mentionUid: string; validatorId: string; status: string; notes?: string };
type ValidationStats = { total: number; validated: number; ... };
type QueueStatus = { available: number; inReview: number; yourOfficer: {...} | null };
type OfficerValidation = { id: string; mention_uid: string; data: OfficerValidationData; ... };
```

## Best Practices

### ✅ DO
- Use barrel imports: `import { useClaimOfficer } from '@/hooks'`
- Handle loading states: `if (isLoading) return <Spinner />`
- Handle error states: `if (error) return <Error error={error} />`
- Use `onSuccess`/`onError` callbacks for side effects
- Let React Query handle caching and refetching

### ❌ DON'T
- Don't fetch officer data manually (use cache)
- Don't manually invalidate queries (hooks handle it)
- Don't disable refetching without reason
- Don't ignore loading/error states

## Testing

### Manual Testing
```bash
# Start dev server
npm run dev

# Open browser to http://localhost:3000
# Test in React DevTools or components
```

### Integration Testing
See `todo/phase-3-summary.md` for complete testing plan.

## Performance

### Caching
- Officer detail: Cached until invalidated
- Stats: Fresh for 25s, refetch every 30s
- Queue: Fresh for 8s, refetch every 10s

### Network
- Polling balanced for UX vs load
- Query deduplication prevents duplicate requests
- Window focus refetching keeps data fresh

## Troubleshooting

### "Query is undefined"
- Ensure React Query provider is configured in `app/layout.tsx`

### "Officer not in cache"
- Officer must be claimed first via `useClaimOfficer`
- Cache is populated on successful claim

### "Hooks not refetching"
- Check `staleTime` and `refetchInterval` configuration
- Verify network requests in browser DevTools

### "TypeScript errors"
- Ensure `@/lib/types` is properly exported
- Check import paths are correct

## Related Documentation

- [Phase 3 Summary](../todo/phase-3-summary.md) - Complete implementation details
- [API Documentation](../API_DOCUMENTATION.md) - API endpoint reference
- [Type Definitions](../lib/types.ts) - TypeScript types
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview) - Official React Query docs
