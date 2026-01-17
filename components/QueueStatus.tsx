'use client';

import React, { useState } from 'react';
import { Clock, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useQueueStatus, useClaimOfficer, useReleaseOfficer } from '@/hooks';
import styles from './QueueStatus.module.scss';

interface QueueStatusProps {
  validatorId: string;
  onOfficerClaimed?: (mentionUid: string) => void;
  onOfficerReleased?: () => void;
}

/**
 * QueueStatus - Show queue state and validator status
 *
 * Data displayed:
 * - Available officers count
 * - In review count
 * - Currently reviewing officer name
 * - Time elapsed on current officer
 * - "Get Next Officer" button (primary)
 * - "Release Current Officer" button (secondary)
 *
 * Behavior:
 * - "Get Next Officer" disabled if already reviewing
 * - Shows loading state while claiming
 * - Shows error if no officers available
 * - Timer updates every 10 seconds via polling
 */
export default function QueueStatus({
  validatorId,
  onOfficerClaimed,
  onOfficerReleased,
}: QueueStatusProps) {
  const { data: queueStatus, isLoading, error } = useQueueStatus(validatorId);
  const claimOfficer = useClaimOfficer();
  const releaseOfficer = useReleaseOfficer();
  const [claimError, setClaimError] = useState<string | null>(null);

  const handleClaimOfficer = () => {
    setClaimError(null);
    claimOfficer.mutate(
      { validatorId },
      {
        onSuccess: (data) => {
          if (data.officer) {
            onOfficerClaimed?.(data.officer.mention_uid);
          } else {
            setClaimError('No officers available for review');
          }
        },
        onError: (error) => {
          setClaimError(error.message);
        },
      }
    );
  };

  const handleReleaseOfficer = () => {
    if (!queueStatus?.yourOfficer) return;

    if (confirm('Are you sure you want to release this officer? It will return to the queue.')) {
      releaseOfficer.mutate(
        {
          mentionUid: queueStatus.yourOfficer.mention_uid,
          validatorId,
        },
        {
          onSuccess: () => {
            onOfficerReleased?.();
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className={styles.card}>
        <h2 className={styles.title}>Queue Status</h2>
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} size={24} />
          <p className={styles.loadingText}>Loading queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <h2 className={styles.title}>Queue Status</h2>
        <div className={styles.errorContainer}>
          <AlertCircle size={20} className={styles.errorIcon} />
          <p className={styles.errorText}>Failed to load queue status</p>
        </div>
      </div>
    );
  }

  if (!queueStatus) {
    return null;
  }

  const isReviewing = !!queueStatus.yourOfficer;

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Queue Status</h2>

      {/* Queue counts */}
      <div className={styles.countsGrid}>
        <div className={styles.countItem}>
          <div className={`${styles.countNumber} ${styles.countAvailable}`}>
            {queueStatus.available}
          </div>
          <div className={styles.countLabel}>Available</div>
        </div>
        <div className={styles.countItem}>
          <div className={`${styles.countNumber} ${styles.countInReview}`}>
            {queueStatus.inReview}
          </div>
          <div className={styles.countLabel}>In Review</div>
        </div>
      </div>

      {/* Currently reviewing section */}
      {isReviewing && queueStatus.yourOfficer && (
        <div className={styles.reviewingSection}>
          <div className={styles.reviewingHeader}>
            <Lock size={16} className={styles.lockIcon} />
            <span className={styles.reviewingLabel}>Currently Reviewing</span>
          </div>
          <div className={styles.officerName}>
            {queueStatus.yourOfficer.officer_name}
          </div>
          <div className={styles.timerSection}>
            <Clock size={14} className={styles.clockIcon} />
            <span className={styles.timerText}>
              {queueStatus.yourOfficer.time_elapsed_minutes} min elapsed
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className={styles.actionsSection}>
        <button
          className={styles.primaryButton}
          onClick={handleClaimOfficer}
          disabled={isReviewing || claimOfficer.isPending}
        >
          {claimOfficer.isPending ? (
            <>
              <Loader2 size={16} className={styles.buttonSpinner} />
              Claiming...
            </>
          ) : (
            <>
              Get Next Officer
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {isReviewing && (
          <button
            className={styles.secondaryButton}
            onClick={handleReleaseOfficer}
            disabled={releaseOfficer.isPending}
          >
            {releaseOfficer.isPending ? (
              <>
                <Loader2 size={16} className={styles.buttonSpinner} />
                Releasing...
              </>
            ) : (
              'Release Current Officer'
            )}
          </button>
        )}
      </div>

      {/* Error message */}
      {claimError && (
        <div className={styles.claimError}>
          <AlertCircle size={16} />
          <span>{claimError}</span>
        </div>
      )}
    </div>
  );
}
