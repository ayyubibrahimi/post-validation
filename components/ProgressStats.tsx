'use client';

import React from 'react';
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { useValidationStats } from '@/hooks';
import styles from './ProgressStats.module.scss';

/**
 * ProgressStats - Show real-time validation progress
 *
 * Data displayed:
 * - Total officers in system
 * - Validated count and percentage
 * - Status breakdown: Correct, Incorrect, Needs Review
 * - Success rate (correct / (correct + incorrect))
 * - Progress bar showing completion percentage
 *
 * Features:
 * - Uses useValidationStats() hook (auto-polling every 30s)
 * - Dark card with colored badges for each status
 * - Loading state with skeleton
 * - Error handling
 */
export default function ProgressStats() {
  const { data: stats, isLoading, error } = useValidationStats();

  if (isLoading) {
    return (
      <div className={styles.card}>
        <h2 className={styles.title}>Progress Stats</h2>
        <div className={styles.loadingContainer}>
          <Loader2 className={styles.spinner} size={24} />
          <p className={styles.loadingText}>Loading stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <h2 className={styles.title}>Progress Stats</h2>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>Failed to load stats</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const validationPercentage = stats.total > 0
    ? Math.round((stats.validated / stats.total) * 100)
    : 0;

  const successRatePercentage = (stats.correct + stats.incorrect) > 0
    ? Math.round((stats.successRate) * 100)
    : 0;

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Progress Stats</h2>

      {/* Total and Validated */}
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>{stats.total}</div>
          <div className={styles.statLabel}>Total Officers</div>
        </div>
        <div className={styles.statItem}>
          <div className={styles.statNumber}>{stats.validated}</div>
          <div className={styles.statLabel}>Validated</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Completion</span>
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
        <h3 className={styles.sectionTitle}>Status Breakdown</h3>
        <div className={styles.statusList}>
          <div className={styles.statusItem}>
            <CheckCircle size={16} className={styles.iconCorrect} />
            <span className={styles.statusLabel}>Correct</span>
            <span className={`${styles.badge} ${styles.badgeCorrect}`}>
              {stats.correct}
            </span>
          </div>
          <div className={styles.statusItem}>
            <XCircle size={16} className={styles.iconIncorrect} />
            <span className={styles.statusLabel}>Incorrect</span>
            <span className={`${styles.badge} ${styles.badgeIncorrect}`}>
              {stats.incorrect}
            </span>
          </div>
          <div className={styles.statusItem}>
            <Eye size={16} className={styles.iconReview} />
            <span className={styles.statusLabel}>Needs Review</span>
            <span className={`${styles.badge} ${styles.badgeReview}`}>
              {stats.needsReview}
            </span>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      {(stats.correct + stats.incorrect) > 0 && (
        <div className={styles.successSection}>
          <div className={styles.successHeader}>
            <span className={styles.successLabel}>Success Rate</span>
            <span
              className={`${styles.successRate} ${
                successRatePercentage >= 90 ? styles.successRateHigh : styles.successRateMedium
              }`}
            >
              {successRatePercentage}%
            </span>
          </div>
          <p className={styles.successDescription}>
            {stats.correct} correct out of {stats.correct + stats.incorrect} decided
          </p>
        </div>
      )}
    </div>
  );
}
