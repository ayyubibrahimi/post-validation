import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OfficerValidation } from '@/lib/types';

/**
 * Query hook for accessing a claimed officer's data
 *
 * Features:
 * - Retrieves officer data from React Query cache (set by useClaimOfficer)
 * - Only fetches if mentionUid exists (enabled: !!mentionUid)
 * - Auto-caches with React Query
 * - Returns cached data immediately if available
 * - No refetching needed since data is set by claim/validate mutations
 *
 * Note: Officer data is populated by useClaimOfficer when claiming an officer.
 * This hook provides type-safe access to that cached data.
 *
 * Usage:
 * ```tsx
 * const { data: officer, isLoading } = useOfficerDetail(mentionUid);
 *
 * if (isLoading || !officer) return <div>Loading...</div>;
 *
 * return <OfficerDetail officer={officer} />;
 * ```
 */
export function useOfficerDetail(mentionUid: string | null | undefined) {
  const queryClient = useQueryClient();

  return useQuery<OfficerValidation | null, Error>({
    queryKey: ['officerDetail', mentionUid],
    queryFn: async () => {
      if (!mentionUid) {
        return null;
      }

      // Try to get from cache first (set by useClaimOfficer)
      const cachedData = queryClient.getQueryData<OfficerValidation>([
        'officerDetail',
        mentionUid,
      ]);

      if (cachedData) {
        return cachedData;
      }

      // If not in cache, return null
      // In production, you might want to fetch from a GET endpoint here
      return null;
    },
    enabled: !!mentionUid,
    staleTime: Infinity, // Data doesn't change once claimed until validated
    refetchOnWindowFocus: false, // No need to refetch
    refetchOnMount: false, // No need to refetch
  });
}
