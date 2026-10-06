import { useQuery } from '@tanstack/react-query';

export type OfficerListStatus =
  | 'pending'
  | 'being_reviewed'
  | 'correct'
  | 'incorrect'
  | 'needs_review'
  | 'skipped';

export interface OfficerListItem {
  mention_uid: string;
  officer_name: string;
  matched_post_id: string | null;
  status: OfficerListStatus;
}

/**
 * Query hook for a reviewer's assigned officer list (sidebar navigation).
 *
 * - Calls GET /api/officers/list?validatorId=...
 * - Keyed by validatorId so switching reviewers refetches the right set
 * - Invalidated by useValidateOfficer so status badges update after each save
 */
export function useOfficerList(validatorId: string | null | undefined) {
  return useQuery<OfficerListItem[], Error>({
    queryKey: ['officerList', validatorId ?? null],
    queryFn: async () => {
      const response = await fetch(
        `/api/officers/list?validatorId=${encodeURIComponent(validatorId as string)}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch officer list');
      }
      const data = await response.json();
      return data.officers as OfficerListItem[];
    },
    enabled: !!validatorId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
