import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReleaseOfficerRequest, ReleaseOfficerResponse } from '@/lib/types';

/**
 * Mutation hook for releasing an officer without validation
 *
 * Features:
 * - Calls POST /api/officers/release
 * - Releases lock and returns officer to pending status
 * - Invalidates queue queries to update UI
 * - Handles loading and error states
 *
 * Usage:
 * ```tsx
 * const releaseOfficer = useReleaseOfficer();
 *
 * const handleRelease = () => {
 *   releaseOfficer.mutate(
 *     {
 *       mentionUid: officer.mention_uid,
 *       validatorId: 'user_123'
 *     },
 *     {
 *       onSuccess: () => {
 *         toast.success('Officer released successfully');
 *         // Navigate away or clear state
 *       },
 *       onError: (error) => {
 *         toast.error(error.message);
 *       }
 *     }
 *   );
 * };
 * ```
 */
export function useReleaseOfficer() {
  const queryClient = useQueryClient();

  return useMutation<ReleaseOfficerResponse, Error, ReleaseOfficerRequest>({
    mutationFn: async (request: ReleaseOfficerRequest) => {
      const response = await fetch('/api/officers/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to release officer');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate validation stats
      queryClient.invalidateQueries({ queryKey: ['validationStats'] });

      // Invalidate queue status (available count, yourOfficer state)
      queryClient.invalidateQueries({ queryKey: ['queueStatus'] });

      // Remove the officer from cache since it's no longer claimed
      queryClient.removeQueries({
        queryKey: ['officerDetail', variables.mentionUid],
      });
    },
    onError: (error) => {
      console.error('Error releasing officer:', error);
    },
  });
}
