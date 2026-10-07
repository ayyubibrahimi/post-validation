'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import ValidationHeader from '@/components/ValidationHeader';
import OfficerList from '@/components/OfficerList';
import OfficerDetail from '@/components/OfficerDetail';
import { useOfficerList, type OfficerListItem } from '@/hooks';
import styles from './DashboardContent.module.scss';

const REVIEWER_NAME_KEY = 'reviewer_name';
// Fixed reviewer roster for the validation-set exercise. Each reviewer only
// sees the 50 rows assigned to them.
export const REVIEWERS = ['Tarak', 'Tristan', 'Galen'] as const;
const DEFAULT_REVIEWER_NAME = REVIEWERS[0];

const PENDING_STATUSES = new Set(['pending', 'being_reviewed', 'skipped']);
const isPending = (o: OfficerListItem) => PENDING_STATUSES.has(o.status);

/**
 * Dashboard Content
 *
 * Layout:
 * - Top header: reviewer switcher + progress
 * - Left sidebar: the reviewer's assigned officers (click to open)
 * - Main: officer detail with validation actions
 *
 * No claiming/locking — each reviewer owns a distinct set of rows, so they
 * navigate their list freely.
 */
export default function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentOfficerUid = searchParams.get('officer');

  // Reviewer identity from localStorage (persists across sessions). Restricted
  // to the fixed roster; defaults to the first reviewer.
  const [reviewerName, setReviewerName] = useState<string>(DEFAULT_REVIEWER_NAME);

  useEffect(() => {
    const stored = localStorage.getItem(REVIEWER_NAME_KEY);
    if (stored && (REVIEWERS as readonly string[]).includes(stored)) {
      setReviewerName(stored);
    }
  }, []);

  const validatorId = reviewerName;
  const { data: officers } = useOfficerList(validatorId);

  // Select an officer -> reflect in the URL.
  const handleSelect = useCallback(
    (mentionUid: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('officer', mentionUid);
      router.push(`/dashboard?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Keyboard: j / k move to the next / previous officer in the list. Ignored while
  // typing or with a modifier. (1 / 2 / 3 verdicts live in OfficerDetail.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'j' && e.key !== 'k') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      const list = officers ?? [];
      if (list.length === 0) return;
      const idx = list.findIndex((o) => o.mention_uid === currentOfficerUid);
      const nextIdx =
        idx === -1 ? 0 : Math.min(Math.max(idx + (e.key === 'j' ? 1 : -1), 0), list.length - 1);
      if (nextIdx !== idx) handleSelect(list[nextIdx].mention_uid);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [officers, currentOfficerUid, handleSelect]);

  /**
   * Switch the active reviewer: persist, clear the current officer (it belongs
   * to the other reviewer's set). The list/stats hooks are keyed by validatorId
   * so they refetch automatically.
   */
  const handleChangeReviewer = (name: string) => {
    if (name === reviewerName) return;
    localStorage.setItem(REVIEWER_NAME_KEY, name);
    setReviewerName(name);
    router.push('/dashboard');
  };

  /**
   * After a validation, jump to the next still-pending officer (wrapping) so the
   * reviewer keeps moving. Falls back to clearing the selection when the set is
   * fully validated.
   */
  const handleValidationComplete = () => {
    toast.success('Validation saved');

    const list = officers ?? [];
    const currentIdx = list.findIndex((o) => o.mention_uid === currentOfficerUid);
    const ordered = [
      ...list.slice(currentIdx + 1),
      ...list.slice(0, Math.max(currentIdx, 0)),
    ];
    const next = ordered.find((o) => o.mention_uid !== currentOfficerUid && isPending(o));

    if (next) {
      handleSelect(next.mention_uid);
    } else {
      router.push('/dashboard');
      toast.info('All officers reviewed', {
        description: 'Every officer in your set has a decision.',
      });
    }
  };

  return (
    <div className={styles.dashboard}>
      <ValidationHeader
        validatorId={validatorId}
        reviewerName={reviewerName}
        reviewers={REVIEWERS as readonly string[]}
        onChangeReviewer={handleChangeReviewer}
      />

      <div className={styles.body}>
        <OfficerList
          validatorId={validatorId}
          currentOfficerUid={currentOfficerUid}
          onSelect={handleSelect}
        />

        <main className={styles.mainContent}>
          <OfficerDetail
            key={currentOfficerUid ?? 'none'}
            mentionUid={currentOfficerUid}
            validatorId={validatorId}
            onValidationComplete={handleValidationComplete}
          />
        </main>
      </div>
    </div>
  );
}
