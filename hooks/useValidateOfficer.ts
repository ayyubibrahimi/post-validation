import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ValidateOfficerRequest, ValidateOfficerResponse } from '@/lib/types';

/**
 * Mutation hook for validating an officer (correct/incorrect/needs_review)
 *
 * Features:
 * - Calls POST /api/officers/validate
 * - Updates officer status (correct/incorrect/needs_review)
 * - Releases lock and stores notes
 * - Invalidates all related queries to refresh UI
 * - Handles loading and error states
 *
 * Usage:
 * ```tsx
 * const validateOfficer = useValidateOfficer();
 *
 * const handleValidate = (status: 'correct' | 'incorrect' | 'needs_review') => {
 *   validateOfficer.mutate(
 *     {
 *       mentionUid: officer.mention_uid,
 *       validatorId: 'user_123',
 *       status,
 *       notes: 'Employment dates match all citations'
 *     },
 *     {
 *       onSuccess: () => {
 *         toast.success('Validation saved successfully!');
 *         // Optionally navigate or fetch next officer
 *       },
 *       onError: (error) => {
 *         toast.error(error.message);
 *       }
 *     }
 *   );
 * };
 * ```
 */
export function useValidateOfficer() {
  const queryClient = useQueryClient();

  return useMutation<ValidateOfficerResponse, Error, ValidateOfficerRequest>({
    mutationFn: async (request: ValidateOfficerRequest) => {
      const response = await fetch('/api/officers/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to validate officer');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate validation stats (total counts, success rate)
      queryClient.invalidateQueries({ queryKey: ['validationStats'] });

      // Invalidate queue status (available count, yourOfficer state)
      queryClient.invalidateQueries({ queryKey: ['queueStatus'] });

      // Update the specific officer in cache with new validation status
      queryClient.setQueryData(
        ['officerDetail', variables.mentionUid],
        data.officer
      );

      // Optionally invalidate all officer queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['officerDetail'] });
    },
    onError: (error) => {
      console.error('Error validating officer:', error);
    },
  });
}
