'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Eye,
  Lock,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useOfficerDetail, useValidateOfficer } from '@/hooks';
import CitationCard from './CitationCard';
import type { EmploymentHistory } from '@/lib/types';
import styles from './OfficerDetail.module.scss';

interface OfficerDetailProps {
  mentionUid: string | null;
  validatorId: string;
  onValidationComplete?: () => void;
}

/**
 * OfficerDetail - Main content area showing full officer information
 *
 * Sections (vertically stacked):
 * 1. Header Section: Input name, matched officer, probability, agency, lock indicator
 * 2. Employment Comparison: Matched officer vs other officers with same name
 * 3. Citations Section: List of CitationCard components
 * 4. Validation Actions: Confirm/Reject/Review buttons with notes
 *
 * Empty State: "Click 'Get Next Officer' to begin validation"
 */
export default function OfficerDetail({
  mentionUid,
  validatorId,
  onValidationComplete,
}: OfficerDetailProps) {
  const { data: officer, isLoading } = useOfficerDetail(mentionUid);
  const validateOfficer = useValidateOfficer();
  const [notes, setNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState<
    'correct' | 'incorrect' | 'needs_review' | null
  >(null);

  const handleValidate = (status: 'correct' | 'incorrect' | 'needs_review') => {
    setShowConfirmDialog(status);
  };

  const confirmValidation = () => {
    if (!officer || !showConfirmDialog) return;

    validateOfficer.mutate(
      {
        mentionUid: officer.mention_uid,
        validatorId,
        status: showConfirmDialog,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowConfirmDialog(null);
          setNotes('');
          onValidationComplete?.();
        },
        onError: (error) => {
          alert(`Error: ${error.message}`);
        },
      }
    );
  };

  // Empty state
  if (!mentionUid || !officer) {
    return (
      <div className={styles.emptyState}>
        <ArrowRight size={48} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Ready to Begin</h2>
        <p className={styles.emptyDescription}>
          Click "Get Next Officer" in the sidebar to start validating officer matches
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={48} className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Loading officer details...</p>
      </div>
    );
  }

  const { officer_info, matched_officer_employment_history, other_officers_with_same_name, citations } =
    officer.data;

  const matchProbability = officer_info.match_probability * 100;
  const matchColor =
    matchProbability >= 85
      ? styles.matchHigh
      : matchProbability >= 70
      ? styles.matchMedium
      : styles.matchLow;

  const hasConflicts = other_officers_with_same_name.length > 0;
  const hasCitations = citations.length > 0;

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <div className={styles.label}>Input Officer Name</div>
            <div className={styles.inputName}>{officer_info.provisional_case_name}</div>
          </div>
          <div className={styles.lockIndicator}>
            <Lock size={16} />
            <span>Assigned to you</span>
          </div>
        </div>

        <div className={styles.matchInfo}>
          <div className={styles.matchedName}>
            <span className={styles.label}>Matched Officer</span>
            <div className={styles.officerName}>
              {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
            </div>
            <div className={styles.postId}>POST ID: {officer_info.matched_post_id}</div>
          </div>

          <div className={styles.probability}>
            <span className={styles.label}>Match Probability</span>
            <div className={`${styles.probabilityValue} ${matchColor}`}>
              {matchProbability.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className={styles.agency}>
          <span className={styles.label}>Matched Agency</span>
          <div className={styles.agencyName}>{officer_info.matched_agency}</div>
        </div>
      </div>

      {/* Employment Comparison Section */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>Employment History Comparison</h2>

        <div className={styles.comparisonGrid}>
          {/* Left: Matched Officer */}
          <div className={styles.comparisonColumn}>
            <h3 className={styles.columnTitle}>Matched Officer Employment</h3>
            {matched_officer_employment_history.length > 0 ? (
              <EmploymentTable
                employments={matched_officer_employment_history}
                isMatched={true}
              />
            ) : (
              <div className={styles.noData}>No employment history available</div>
            )}
          </div>

          {/* Right: Other Officers */}
          <div className={styles.comparisonColumn}>
            <h3 className={styles.columnTitle}>
              Other Officers with Same Name
              {hasConflicts && (
                <span className={styles.conflictBadge}>
                  <AlertTriangle size={14} />
                  {other_officers_with_same_name.length} found
                </span>
              )}
            </h3>
            {hasConflicts ? (
              other_officers_with_same_name.map((otherOfficer, index) => (
                <div key={index} className={styles.otherOfficerSection}>
                  <div className={styles.otherOfficerHeader}>
                    <span className={styles.otherOfficerName}>{otherOfficer.officer_name}</span>
                    <span className={styles.otherOfficerPostId}>
                      POST ID: {otherOfficer.post_id}
                    </span>
                  </div>
                  <EmploymentTable
                    employments={otherOfficer.employment_history}
                    isMatched={false}
                  />
                </div>
              ))
            ) : (
              <div className={styles.noConflicts}>
                <CheckCircle size={20} className={styles.noConflictsIcon} />
                <span>No conflicting officers found</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Citations Section */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Citations ({citations.length})
          {!hasCitations && (
            <span className={styles.warningBadge}>
              <AlertTriangle size={14} />
              No citations - verify manually
            </span>
          )}
        </h2>

        {hasCitations ? (
          <div className={styles.citationsList}>
            {citations.map((citation, index) => (
              <CitationCard key={index} citation={citation} />
            ))}
          </div>
        ) : (
          <div className={styles.noCitations}>
            <AlertTriangle size={24} className={styles.warningIcon} />
            <p>No citations found for this officer. Proceed with caution.</p>
          </div>
        )}
      </div>

      {/* Validation Actions Section */}
      <div className={styles.actionsCard}>
        <h2 className={styles.sectionTitle}>Validation Decision</h2>

        <textarea
          className={styles.notesTextarea}
          placeholder="Add notes (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        <div className={styles.actionButtons}>
          <button
            className={`${styles.actionButton} ${styles.confirmButton}`}
            onClick={() => handleValidate('correct')}
            disabled={validateOfficer.isPending}
          >
            <CheckCircle size={18} />
            Confirm Match
          </button>
          <button
            className={`${styles.actionButton} ${styles.rejectButton}`}
            onClick={() => handleValidate('incorrect')}
            disabled={validateOfficer.isPending}
          >
            <XCircle size={18} />
            Reject Match
          </button>
          <button
            className={`${styles.actionButton} ${styles.reviewButton}`}
            onClick={() => handleValidate('needs_review')}
            disabled={validateOfficer.isPending}
          >
            <Eye size={18} />
            Needs Review
          </button>
        </div>
      </div>

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
function EmploymentTable({
  employments,
  isMatched,
}: {
  employments: EmploymentHistory[];
  isMatched: boolean;
}) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Agency</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {employments.map((emp, index) => (
            <tr key={index} className={isMatched ? styles.matchedRow : ''}>
              <td>{emp.agency_name}</td>
              <td>{emp.start_date || 'N/A'}</td>
              <td>{emp.end_date || 'Present'}</td>
              <td>
                {emp.duration_days
                  ? `${Math.floor(emp.duration_days / 365)}y ${Math.floor((emp.duration_days % 365) / 30)}m`
                  : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
