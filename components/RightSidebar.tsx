'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Eye, Loader2, AlertTriangle, Users } from 'lucide-react';
import { useValidateOfficer, useOfficerDetail } from '@/hooks';
import type { EmploymentHistory } from '@/lib/types';
import Carousel from './Carousel';
import styles from './RightSidebar.module.scss';

interface RightSidebarProps {
  mentionUid: string | null;
  validatorId: string;
  onValidationComplete?: () => void;
}

/**
 * RightSidebar - Validation action controls and other officers
 *
 * Contains:
 * - Notes textarea
 * - Confirm Match button (green)
 * - Reject Match button (red)
 * - Needs Review button (yellow)
 * - Confirmation dialog
 * - Other Officers with Same Name card
 */
export default function RightSidebar({
  mentionUid,
  validatorId,
  onValidationComplete,
}: RightSidebarProps) {
  const validateOfficer = useValidateOfficer();
  const { data: officer } = useOfficerDetail(mentionUid);
  const [showConfirmDialog, setShowConfirmDialog] = useState<
    'correct' | 'incorrect' | 'needs_review' | null
  >(null);

  const handleValidate = (status: 'correct' | 'incorrect' | 'needs_review') => {
    setShowConfirmDialog(status);
  };

  const confirmValidation = () => {
    if (!mentionUid || !showConfirmDialog) return;

    validateOfficer.mutate(
      {
        mentionUid,
        validatorId,
        status: showConfirmDialog,
        notes: undefined,
      },
      {
        onSuccess: () => {
          setShowConfirmDialog(null);
          onValidationComplete?.();
        },
        onError: (error) => {
          alert(`Error: ${error.message}`);
        },
      }
    );
  };

  const isDisabled = !mentionUid || validateOfficer.isPending;

  // Extract other officers data
  const otherOfficersData = officer?.data?.other_officers_with_same_name || [];

  // Group other officers by POST ID with full employment history
  const groupedOtherOfficers = otherOfficersData.reduce((acc, emp) => {
    const postId = emp.post_person_nbr || 'Unknown';
    if (!acc[postId]) {
      acc[postId] = {
        post_id: postId,
        officer_name: `${emp.post_first_name || ''} ${emp.post_middle_name || ''} ${
          emp.post_last_name || ''
        }`.trim(),
        employment_history: [],
      };
    }
    acc[postId].employment_history.push(emp);
    return acc;
  }, {} as Record<string, { post_id: string; officer_name: string; employment_history: EmploymentHistory[] }>);

  const otherOfficersArray = Object.values(groupedOtherOfficers);

  return (
    <div className={styles.sidebar}>
      {/* Validation Decision Card */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Validation Decision</h3>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <button
            className={`${styles.actionButton} ${styles.confirmButton}`}
            onClick={() => handleValidate('correct')}
            disabled={isDisabled}
          >
            <CheckCircle size={20} />
            Confirm Match
          </button>

          <button
            className={`${styles.actionButton} ${styles.rejectButton}`}
            onClick={() => handleValidate('incorrect')}
            disabled={isDisabled}
          >
            <XCircle size={20} />
            Reject Match
          </button>

          <button
            className={`${styles.actionButton} ${styles.reviewButton}`}
            onClick={() => handleValidate('needs_review')}
            disabled={isDisabled}
          >
            <Eye size={20} />
            Needs Review
          </button>
        </div>

        {!mentionUid && (
          <p className={styles.disabledText}>
            Claim an officer to enable validation
          </p>
        )}
      </div>

      {/* Other Officers Card */}
      {officer && (
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>
            <Users size={14} />
            Other Officers
            {otherOfficersArray.length > 0 && (
              <span className={styles.countBadge}>{otherOfficersArray.length}</span>
            )}
          </h3>

          {otherOfficersArray.length > 0 ? (
            <Carousel
              items={otherOfficersArray}
              renderItem={(otherOfficer) => (
                <div className={styles.otherOfficerCard}>
                  <div className={styles.otherOfficerHeader}>
                    <div className={styles.otherOfficerName}>{otherOfficer.officer_name}</div>
                    <div className={styles.postIdBadge}>ID: {otherOfficer.post_id}</div>
                  </div>
                  <EmploymentTable employments={otherOfficer.employment_history} />
                </div>
              )}
              emptyState={null}
              controlsPosition="bottom"
            />
          ) : (
            <div className={styles.noOtherOfficers}>
              <CheckCircle size={16} className={styles.noConflictsIcon} />
              <span>No conflicting officers found</span>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className={styles.dialogOverlay} onClick={() => setShowConfirmDialog(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>Confirm Validation</h3>
            <p className={styles.dialogMessage}>
              Are you sure you want to mark this officer as{' '}
              <strong>{showConfirmDialog.toUpperCase().replace('_', ' ')}</strong>?
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.dialogCancelButton}
                onClick={() => setShowConfirmDialog(null)}
                disabled={validateOfficer.isPending}
              >
                Cancel
              </button>
              <button
                className={styles.dialogConfirmButton}
                onClick={confirmValidation}
                disabled={validateOfficer.isPending}
              >
                {validateOfficer.isPending ? (
                  <>
                    <Loader2 size={16} className={styles.buttonSpinner} />
                    Saving...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Employment Table Component
function EmploymentTable({ employments }: { employments: EmploymentHistory[] }) {
  const calculateDuration = (startDate: string | undefined, endDate: string | null | undefined) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return null;
    const datePart = date.split(' ')[0].split('T')[0];
    return datePart;
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Agency</th>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {employments.length > 0 ? (
            employments.map((emp, index) => {
              const durationDays = calculateDuration(emp.post_start_date, emp.post_end_date);
              return (
                <tr key={index}>
                  <td>{emp.post_agency_name || 'N/A'}</td>
                  <td>{formatDate(emp.post_start_date) || 'N/A'}</td>
                  <td>{emp.post_end_date ? formatDate(emp.post_end_date) : 'Present'}</td>
                  <td>
                    {durationDays
                      ? `${Math.floor(durationDays / 365)}y ${Math.floor(
                          (durationDays % 365) / 30
                        )}m`
                      : 'N/A'}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                No employment history
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
