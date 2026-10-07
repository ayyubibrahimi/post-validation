'use client';

import { CheckCircle, XCircle, Eye, Circle, Loader2 } from 'lucide-react';
import { useOfficerList, type OfficerListStatus } from '@/hooks';
import styles from './OfficerList.module.scss';

interface OfficerListProps {
  validatorId: string;
  currentOfficerUid: string | null;
  onSelect: (mentionUid: string) => void;
}

const STATUS_META: Record<
  OfficerListStatus,
  { label: string; className: string; Icon: typeof CheckCircle }
> = {
  pending: { label: 'Pending', className: 'pending', Icon: Circle },
  being_reviewed: { label: 'Pending', className: 'pending', Icon: Circle },
  skipped: { label: 'Pending', className: 'pending', Icon: Circle },
  correct: { label: 'Correct', className: 'correct', Icon: CheckCircle },
  incorrect: { label: 'Incorrect', className: 'incorrect', Icon: XCircle },
  needs_review: { label: 'Needs review', className: 'needsReview', Icon: Eye },
};

/**
 * OfficerList - Sidebar of a reviewer's assigned officers.
 *
 * Reviewers navigate freely (no claiming/locking): click any officer to open
 * it. A status badge shows validation progress at a glance.
 */
export default function OfficerList({ validatorId, currentOfficerUid, onSelect }: OfficerListProps) {
  const { data: officers, isLoading, error } = useOfficerList(validatorId);

  const validatedCount = officers?.filter(
    (o) => o.status === 'correct' || o.status === 'incorrect' || o.status === 'needs_review'
  ).length;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>Your officers</span>
        {officers && (
          <span className={styles.progress}>
            {validatedCount}/{officers.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className={styles.stateContainer}>
          <Loader2 size={18} className={styles.spinner} />
          <span>Loading…</span>
        </div>
      ) : error ? (
        <div className={styles.stateContainer}>
          <span className={styles.errorText}>{error.message}</span>
        </div>
      ) : !officers || officers.length === 0 ? (
        <div className={styles.stateContainer}>
          <span>No officers assigned to {validatorId}.</span>
        </div>
      ) : (
        <ul className={styles.list}>
          {officers.map((officer, index) => {
            const meta = STATUS_META[officer.status] ?? STATUS_META.pending;
            const isActive = officer.mention_uid === currentOfficerUid;
            const { Icon } = meta;
            return (
              <li key={officer.mention_uid}>
                <button
                  className={`${styles.item} ${isActive ? styles.active : ''}`}
                  onClick={() => onSelect(officer.mention_uid)}
                >
                  <span className={styles.index}>{index + 1}</span>
                  <span className={styles.itemBody}>
                    <span className={styles.name}>{officer.officer_name}</span>
                    {officer.matched_post_id && (
                      <span className={styles.postId}>{officer.matched_post_id}</span>
                    )}
                  </span>
                  <Icon size={15} className={`${styles.statusIcon} ${styles[meta.className]}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
