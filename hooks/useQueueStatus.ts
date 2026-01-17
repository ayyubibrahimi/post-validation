import { useQuery } from '@tanstack/react-query';
import type { QueueStatus } from '@/lib/types';

/**
 * Query hook for fetching queue status with auto-polling
 *
 * Features:
 * - Calls GET /api/officers/queue
 * - Returns queue state (available, inReview, yourOfficer, timeElapsed)
 * - Auto-refetches every 10 seconds (faster polling for timer updates)
 * - Requires validatorId parameter
 * - Returns loading and error states
 *
 * Usage:
 * ```tsx
 * const { data: queueStatus, isLoading, error } = useQueueStatus('user_123');
 *
 * if (isLoading) return <QueueLoadingSkeleton />;
 * if (error) return <QueueError />;
 * if (!queueStatus) return null;
 *
 * return (
 *   <div>
 *     <p>Available: {queueStatus.available}</p>
 *     <p>In Review: {queueStatus.inReview}</p>
 *     {queueStatus.yourOfficer && (
 *       <p>Reviewing for: {queueStatus.yourOfficer.time_elapsed_minutes} min</p>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useQueueStatus(validatorId: string | null | undefined) {
  return useQuery<QueueStatus, Error>({
    queryKey: ['queueStatus', validatorId],
    queryFn: async () => {
      if (!validatorId) {
        throw new Error('Validator ID is required');
      }

      const response = await fetch(
        `/api/officers/queue?validatorId=${encodeURIComponent(validatorId)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch queue status');
      }

      const data = await response.json();
      return data;
    },
    enabled: !!validatorId,
    staleTime: 8 * 1000, // Consider fresh for 8 seconds
    refetchInterval: 10 * 1000, // Auto-refetch every 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnMount: true, // Always fetch fresh data on mount
  });
}
