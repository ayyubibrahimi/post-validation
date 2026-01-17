import { useQuery } from '@tanstack/react-query';
import type { ValidationStats } from '@/lib/types';

/**
 * Query hook for fetching validation statistics with auto-polling
 *
 * Features:
 * - Calls GET /api/officers/stats
 * - Returns aggregate stats (total, validated, correct, incorrect, etc.)
 * - Auto-refetches every 30 seconds (polling)
 * - Invalidated after any validation action (via useValidateOfficer)
 * - Returns loading and error states
 *
 * Usage:
 * ```tsx
 * const { data: stats, isLoading, error } = useValidationStats();
 *
 * if (isLoading) return <StatsLoadingSkeleton />;
 * if (error) return <StatsError />;
 * if (!stats) return null;
 *
 * return (
 *   <div>
 *     <p>Total: {stats.total}</p>
 *     <p>Validated: {stats.validated}</p>
 *     <p>Success Rate: {(stats.successRate * 100).toFixed(1)}%</p>
 *   </div>
 * );
 * ```
 */
export function useValidationStats() {
  return useQuery<ValidationStats, Error>({
    queryKey: ['validationStats'],
    queryFn: async () => {
      const response = await fetch('/api/officers/stats');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch validation stats');
      }

      const data = await response.json();
      return data.stats;
    },
    staleTime: 25 * 1000, // Consider fresh for 25 seconds
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to window
    refetchOnMount: true, // Always fetch fresh data on mount
  });
}
