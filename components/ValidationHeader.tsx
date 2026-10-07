'use client';

import { CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';
import { useValidationStats } from '@/hooks';
import styles from './ValidationHeader.module.scss';

interface ValidationHeaderProps {
  validatorId: string;
  reviewerName: string | null;
  reviewers: readonly string[];
  onChangeReviewer: (name: string) => void;
}

/**
 * ValidationHeader - Top bar with the reviewer switcher and progress.
 *
 * No queue/claim controls: reviewers navigate their assigned set via the
 * sidebar, so this header just shows who's reviewing and how far along they are.
 */
export default function ValidationHeader({
  validatorId,
  reviewerName,
  reviewers,
  onChangeReviewer,
}: ValidationHeaderProps) {
  const { data: stats, isLoading: statsLoading } = useValidationStats(validatorId);

  const progressPercentage = stats && stats.total > 0 ? (stats.validated / stats.total) * 100 : 0;

  return (
    <header className={styles.header}>
      {/* Left: title */}
      <div className={styles.brand}>Officer Validation</div>

      {/* Center: Progress & Stats */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }} />
        </div>
        <div className={styles.progressInfo}>
          {statsLoading ? (
            <span className={styles.loading}>Loading...</span>
          ) : (
            <>
              <span className={styles.percentage}>{progressPercentage.toFixed(0)}%</span>
              <span className={styles.progressText}>
                {stats ? `${stats.validated}/${stats.total} reviewed` : 'Progress'}
              </span>

              {stats && stats.validated > 0 && (
                <div className={styles.statsBreakdown}>
                  {stats.correct > 0 && (
                    <div className={styles.statItem}>
                      <CheckCircle size={12} />
                      {stats.correct}
                    </div>
                  )}
                  {stats.incorrect > 0 && (
                    <div className={styles.statItem}>
                      <XCircle size={12} />
                      {stats.incorrect}
                    </div>
                  )}
                  {stats.needsReview > 0 && (
                    <div className={styles.statItem}>
                      <AlertTriangle size={12} />
                      {stats.needsReview}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right: Reviewer switcher */}
      <div className={styles.actions}>
        <div className={styles.reviewerBadge}>
          <User size={14} />
          <select
            value={reviewerName ?? ''}
            onChange={(e) => onChangeReviewer(e.target.value)}
            className={styles.reviewerSelect}
            title="Switch reviewer"
          >
            {reviewers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}
