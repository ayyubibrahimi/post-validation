import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ClaimOfficerRequest, ClaimOfficerResponse, OfficerValidation } from '@/lib/types';

/**
 * Mutation hook for claiming the next available officer
 *
 * Features:
 * - Calls POST /api/officers/claim
 * - Returns officer or null if none available
 * - Invalidates stats and queue queries on success
 * - Handles loading and error states automatically
 *
 * Usage:
 * ```tsx
 * const claimOfficer = useClaimOfficer();
 *
 * const handleClaim = () => {
 *   claimOfficer.mutate(
 *     { validatorId: 'user_123' },
 *     {
 *       onSuccess: (data) => {
 *         if (data.officer) {
 *           console.log('Claimed officer:', data.officer.mention_uid);
 *         } else {
 *           console.log('No officers available');
 *         }
 *       }
 *     }
 *   );
 * };
 * ```
 */
export function useClaimOfficer() {
  const queryClient = useQueryClient();

  return useMutation<ClaimOfficerResponse, Error, ClaimOfficerRequest>({
    mutationFn: async (request: ClaimOfficerRequest) => {
      const response = await fetch('/api/officers/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim officer');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate stats query to refresh counts
      queryClient.invalidateQueries({ queryKey: ['validationStats'] });

      // Invalidate queue status to update available/inReview counts
      queryClient.invalidateQueries({ queryKey: ['queueStatus'] });

      // If an officer was claimed, set it in the cache for immediate access
      if (data.officer) {
        queryClient.setQueryData(
          ['officerDetail', data.officer.mention_uid],
          data.officer
        );
      }
    },
    onError: (error) => {
      console.error('Error claiming officer:', error);
    },
  });
}
