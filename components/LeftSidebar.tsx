'use client';

import { ArrowRight, Loader2, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { useClaimOfficer, useReleaseOfficer, useValidationStats, useQueueStatus } from '@/hooks';
import styles from './LeftSidebar.module.scss';
import { toast } from 'sonner';

interface LeftSidebarProps {
  validatorId: string;
  currentOfficerUid: string | null;
  onOfficerClaimed: (mentionUid: string) => void;
  onOfficerReleased: () => void;
}

/**
 * LeftSidebar - Combined overview dashboard with actions
 *
 * Sections:
 * 1. Overview - Combined stats and queue status
 * 2. Action buttons - Next Officer and Release Officer
 */
export default function LeftSidebar({
  validatorId,
  currentOfficerUid,
  onOfficerClaimed,
  onOfficerReleased,
}: LeftSidebarProps) {
  const { data: stats, isLoading: statsLoading } = useValidationStats();
  const { data: queue } = useQueueStatus(validatorId);
  const claimOfficer = useClaimOfficer();
  const releaseOfficer = useReleaseOfficer();

  const handleNextOfficer = async () => {
    try {
      // Step 1: Release current officer if reviewing one
      if (currentOfficerUid) {
        await releaseOfficer.mutateAsync({
          mentionUid: currentOfficerUid,
          validatorId,
        });
      }

      // Step 2: Claim next available officer
      const result = await claimOfficer.mutateAsync({ validatorId });

      if (result.officer) {
        onOfficerClaimed(result.officer.mention_uid);
        toast.success('Moved to next officer');
      } else {
        toast.info('No more officers available for review');
      }
    } catch (error) {
      console.error('Error moving to next officer:', error);
      toast.error('Failed to move to next officer');
    }
  };

  const handleReleaseOfficer = async () => {
    if (!currentOfficerUid) return;

    try {
      await releaseOfficer.mutateAsync({
        mentionUid: currentOfficerUid,
        validatorId,
      });

      onOfficerReleased();
      toast.info('Officer released');
    } catch (error) {
      console.error('Error releasing officer:', error);
      toast.error('Failed to release officer');
    }
  };

  const isLoading = claimOfficer.isPending || releaseOfficer.isPending;
  const hasAvailableOfficers = (queue?.available || 0) > 0;
  const validationPercentage = stats && stats.total > 0
    ? Math.round((stats.validated / stats.total) * 100)
    : 0;

  return (
    <div className={styles.sidebar}>
      {/* Overview Card */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Overview</h3>

        {statsLoading ? (
          <div className={styles.loadingContainer}>
            <Loader2 className={styles.spinner} size={24} />
            <p className={styles.loadingText}>Loading...</p>
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{stats.total}</div>
                <div className={styles.statLabel}>Total</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{stats.validated}</div>
                <div className={styles.statLabel}>Validated</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{queue?.available || 0}</div>
                <div className={styles.statLabel}>Available</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNumber}>{queue?.inReview || 0}</div>
                <div className={styles.statLabel}>In Review</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>Progress</span>
                <span className={styles.progressPercentage}>{validationPercentage}%</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${validationPercentage}%` }}
                />
              </div>
            </div>

            {/* Status Breakdown */}
            <div className={styles.statusSection}>
              <div className={styles.statusList}>
                <div className={styles.statusItem}>
                  <CheckCircle size={14} className={styles.iconCorrect} />
                  <span className={styles.statusLabel}>Correct</span>
                  <span className={`${styles.badge} ${styles.badgeCorrect}`}>
                    {stats.correct}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <XCircle size={14} className={styles.iconIncorrect} />
                  <span className={styles.statusLabel}>Incorrect</span>
                  <span className={`${styles.badge} ${styles.badgeIncorrect}`}>
                    {stats.incorrect}
                  </span>
                </div>
                <div className={styles.statusItem}>
                  <Eye size={14} className={styles.iconReview} />
                  <span className={styles.statusLabel}>Needs Review</span>
                  <span className={`${styles.badge} ${styles.badgeReview}`}>
                    {stats.needsReview}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <button
                className={styles.nextButton}
                onClick={handleNextOfficer}
                disabled={isLoading || !hasAvailableOfficers}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    Loading...
                  </>
                ) : (
                  <>
                    Next Officer
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {currentOfficerUid && (
                <button
                  className={styles.releaseButton}
                  onClick={handleReleaseOfficer}
                  disabled={isLoading}
                >
                  <X size={16} />
                  Release Officer
                </button>
              )}
            </div>

            {!hasAvailableOfficers && !isLoading && (
              <p className={styles.noOfficersText}>No officers available</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
