'use client';

import { ChevronLeft, ChevronRight, CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';
import { useValidationStats, useQueueStatus, useClaimOfficer, useReleaseOfficer } from '@/hooks';
import { toast } from 'sonner';
import styles from './ValidationHeader.module.scss';

interface ValidationHeaderProps {
  validatorId: string;
  reviewerName: string | null;
  currentOfficerUid: string | null;
  currentIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onPrevious: () => void;
  onNextInHistory: () => void;
  onOfficerClaimed: (mentionUid: string) => void;
  onOfficerReleased: () => void;
  onChangeReviewerName: () => void;
}

/**
 * ValidationHeader - Top navigation bar with all controls
 *
 * Layout:
 * - Left: Previous/Next navigation with position counter
 * - Center: Progress bar with percentage and stats breakdown
 * - Right: Available count + Get Next Officer button
 */
export default function ValidationHeader({
  validatorId,
  reviewerName,
  currentOfficerUid,
  currentIndex,
  canGoBack,
  canGoForward,
  onPrevious,
  onNextInHistory,
  onOfficerClaimed,
  onOfficerReleased,
  onChangeReviewerName,
}: ValidationHeaderProps) {
  const { data: stats, isLoading: statsLoading } = useValidationStats();
  const { data: queue, isLoading: queueLoading } = useQueueStatus(validatorId);
  const claimOfficer = useClaimOfficer();
  const releaseOfficer = useReleaseOfficer();

  const progressPercentage = stats ? (stats.validated / stats.total) * 100 : 0;
  const isReviewingOfficer = !!currentOfficerUid;

  // Handle claim officer
  const handleClaimOfficer = () => {
    claimOfficer.mutate(
      { validatorId },
      {
        onSuccess: (data) => {
          if (data.officer) {
            onOfficerClaimed(data.officer.mention_uid);
            toast.success('Officer claimed', {
              description: `Now reviewing: ${data.officer.data.officer_info.first_name} ${data.officer.data.officer_info.last_name}`,
            });
          } else {
            toast.info('No officers available', {
              description: 'All officers have been claimed or validated',
            });
          }
        },
        onError: (error) => {
          toast.error('Failed to claim officer', {
            description: error.message,
          });
        },
      }
    );
  };

  // Handle release officer
  const handleReleaseOfficer = () => {
    if (!currentOfficerUid) return;

    releaseOfficer.mutate(
      {
        mentionUid: currentOfficerUid,
        validatorId,
      },
      {
        onSuccess: () => {
          onOfficerReleased();
        },
        onError: (error) => {
          toast.error('Failed to release officer', {
            description: error.message,
          });
        },
      }
    );
  };

  // Handle next button click
  const handleNext = () => {
    if (canGoForward) {
      // Navigate forward in history
      onNextInHistory();
    } else {
      // Claim new officer from queue
      handleClaimOfficer();
    }
  };

  return (
    <header className={styles.header}>
      {/* Left: Navigation */}
      <div className={styles.navigation}>
        <button
          onClick={onPrevious}
          disabled={!canGoBack}
          className={styles.navButton}
          aria-label="Previous officer"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <div className={styles.position}>
          <span className={styles.current}>{currentIndex + 1}</span>
          <span className={styles.separator}>of</span>
          <span className={styles.total}>{stats?.total || 0}</span>
        </div>

        <button
          onClick={handleNext}
          disabled={claimOfficer.isPending || (queue?.available === 0 && !canGoForward)}
          className={styles.navButton}
          aria-label="Next officer"
        >
          {claimOfficer.isPending ? 'Loading...' : 'Next'}
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Center: Progress & Stats */}
      <div className={styles.progressSection}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className={styles.progressInfo}>
          {statsLoading ? (
            <span className={styles.loading}>Loading...</span>
          ) : (
            <>
              <span className={styles.percentage}>
                {progressPercentage.toFixed(0)}%
              </span>
              <span className={styles.progressText}>Progress</span>

              {/* Stats Breakdown */}
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

      {/* Right: Available Count + Actions */}
      <div className={styles.actions}>
        {/* Reviewer name badge */}
        <button
          onClick={onChangeReviewerName}
          className={styles.reviewerBadge}
          title="Click to change your name"
        >
          <User size={14} />
          <span>{reviewerName || 'Set name'}</span>
        </button>

        <div className={styles.availableCount}>
          <div className={styles.count}>{queueLoading ? '—' : queue?.available || 0}</div>
          <div className={styles.countLabel}>Available</div>
        </div>

        {isReviewingOfficer ? (
          <button
            onClick={handleReleaseOfficer}
            disabled={releaseOfficer.isPending}
            className={`${styles.actionButton} ${styles.releaseButton}`}
          >
            Return to Queue
          </button>
        ) : (
          <button
            onClick={handleClaimOfficer}
            disabled={claimOfficer.isPending || (queue?.available === 0)}
            className={`${styles.actionButton} ${styles.claimButton}`}
          >
            {claimOfficer.isPending ? 'Claiming...' : 'Get Next Officer'}
          </button>
        )}
      </div>
    </header>
  );
}
