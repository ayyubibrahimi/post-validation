'use client';

import { useState } from 'react';
import { Lock, AlertTriangle, Loader2, ArrowRight, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, ExternalLink } from 'lucide-react';
import { useOfficerDetail, useValidateOfficer } from '@/hooks';
import CitationCard from './CitationCard';
import type { EmploymentHistory } from '@/lib/types';
import styles from './OfficerDetail.module.scss';

interface OfficerDetailProps {
  mentionUid: string | null;
  validatorId: string;
  onValidationComplete: () => void;
}

/**
 * OfficerDetail - Redesigned split comparison layout
 *
 * Layout:
 * 1. Side-by-side comparison (Input Officer | Match % | Matched POST Officer)
 * 2. Validation actions (Confirm/Reject/Needs Review)
 * 3. Tabbed citations (Agency | Incident Date)
 * 4. Collapsible disambiguation section
 */
export default function OfficerDetail({ mentionUid, validatorId, onValidationComplete }: OfficerDetailProps) {
  const { data: officer, isLoading } = useOfficerDetail(mentionUid);
  const validateOfficer = useValidateOfficer();

  const [activeTab, setActiveTab] = useState<'agency' | 'incident'>('agency');
  const [disambiguationOpen, setDisambiguationOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'correct' | 'incorrect' | 'needs_review' | null>(null);

  // Empty state
  if (!mentionUid || !officer) {
    return (
      <div className={styles.emptyState}>
        <ArrowRight size={48} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Ready to Begin</h2>
        <p className={styles.emptyDescription}>
          Click "Next Officer" in the sidebar to start validating officer matches
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

  const {
    officer_info,
    matched_officer_employment_history = [],
    other_officers_with_same_name = [],
    citations = [],
    csv_incident_date,
    csv_citations,
    csv_enriched_at,
  } = officer.data || {};

  // Safety check
  if (!officer_info) {
    return (
      <div className={styles.emptyState}>
        <AlertTriangle size={48} className={styles.emptyIcon} />
        <h2>Invalid Officer Data</h2>
        <p>The officer data is missing or incomplete. Please try claiming another officer.</p>
      </div>
    );
  }

  const matchProbability = officer_info?.match_probability ? officer_info.match_probability * 100 : 0;
  const matchColor = matchProbability >= 85 ? 'high' : matchProbability >= 70 ? 'medium' : 'low';

  // Format dates
  const formatIncidentDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatEnrichedAt = (timestamp: string | null) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return timestamp;
    }
  };

  // Handle validation
  const handleValidationClick = (status: 'correct' | 'incorrect' | 'needs_review') => {
    setPendingAction(status);
    setConfirmDialogOpen(true);
  };

  const handleConfirmValidation = () => {
    if (!pendingAction) return;

    validateOfficer.mutate(
      {
        mentionUid: mentionUid!,
        validatorId,
        status: pendingAction,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setConfirmDialogOpen(false);
          setPendingAction(null);
          setNotes('');
          onValidationComplete();
        },
        onError: (error) => {
          console.error('Validation failed:', error);
        },
      }
    );
  };

  return (
    <div className={styles.container}>
      {/* Split Comparison */}
      <div className={styles.comparisonSection}>
        {/* Left: Input Officer */}
        <div className={styles.inputPanel}>
          <h3 className={styles.panelTitle}>LLM Extractions</h3>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>LLM: Name Extracted</label>
            <div className={styles.fieldValue}>
              {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>LLM: Employing Agency Extracted</label>
            <div className={styles.fieldValue}>{officer_info.matched_agency}</div>
          </div>

          {csv_incident_date && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>LLM: Incident Date Extracted</label>
              <div className={styles.fieldValue}>{formatIncidentDate(csv_incident_date)}</div>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>LLM: All Agencies Mentioned in Case Documents</label>
            <div className={styles.fieldValueMuted}>
              {officer_info.mentioned_agencies || 'None'}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Case ID</label>
            <div className={styles.caseId}>{officer_info.provisional_case_name}</div>
          </div>
        </div>

        {/* Center: Match Badge */}
        <div className={styles.matchBadgeContainer}>
          <div className={`${styles.matchBadge} ${styles[matchColor]}`}>
            <div className={styles.matchPercentage}>{matchProbability.toFixed(1)}%</div>
            <div className={styles.matchLabel}>match</div>
          </div>
        </div>

        {/* Right: Matched POST Officer */}
        <div className={styles.matchedPanel}>
          <div className={styles.matchedHeader}>
            <h3 className={styles.panelTitle}>Entity Res: Matched POST Officer</h3>
            <div className={styles.lockIndicator}>
              <Lock size={12} />
              <span>Assigned</span>
            </div>
          </div>

          <div className={styles.matchedInfo}>
            <div className={styles.matchedName}>
              {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
            </div>
            <div className={styles.postId}>POST ID: {officer_info.matched_post_id}</div>
            <div className={styles.matchedAgency}>Agency: {officer_info.matched_agency}</div>
          </div>

          <div className={styles.employmentHistory}>
            <h4 className={styles.employmentTitle}>Employment History</h4>
            {matched_officer_employment_history.length > 0 ? (
              <EmploymentTable employments={matched_officer_employment_history} />
            ) : (
              <div className={styles.noData}>No employment history available</div>
            )}
          </div>
        </div>
      </div>

      {/* Validation Actions */}
      <div className={styles.actionsSection}>
        <button
          onClick={() => handleValidationClick('correct')}
          disabled={validateOfficer.isPending}
          className={`${styles.actionButton} ${styles.confirmButton}`}
        >
          <CheckCircle size={18} />
          Confirm Match
        </button>

        <button
          onClick={() => handleValidationClick('incorrect')}
          disabled={validateOfficer.isPending}
          className={`${styles.actionButton} ${styles.rejectButton}`}
        >
          <XCircle size={18} />
          Reject Match
        </button>

        <button
          onClick={() => handleValidationClick('needs_review')}
          disabled={validateOfficer.isPending}
          className={`${styles.actionButton} ${styles.reviewButton}`}
        >
          <Eye size={18} />
          Needs Review
        </button>
      </div>

      {/* Tabbed Citations */}
      <div className={styles.citationsSection}>
        <div className={styles.citationsTabs}>
          <button
            onClick={() => setActiveTab('agency')}
            className={`${styles.tab} ${activeTab === 'agency' ? styles.tabActive : ''}`}
          >
            LLM Extractions: Agency Page-Level Citations ({citations.length})
          </button>
          {csv_citations && csv_citations.length > 0 && (
            <button
              onClick={() => setActiveTab('incident')}
              className={`${styles.tab} ${activeTab === 'incident' ? styles.tabActive : ''}`}
            >
              LLM Extractions: Incident Date Page-Level Citations ({csv_citations.length})
              {csv_enriched_at && (
                <span className={styles.enrichedBadge}>
                </span>
              )}
            </button>
          )}
        </div>

        <div className={styles.citationsContent}>
          {activeTab === 'agency' && (
            <div className={styles.citationsList}>
              {citations.length > 0 ? (
                citations.map((citation, index) => (
                  <CitationCard key={index} citation={citation} type="agency" />
                ))
              ) : (
                <div className={styles.noCitations}>
                  <AlertTriangle size={24} />
                  <p>No agency citations available.</p>
                  {officer_info.document_link && (
                    <p className={styles.documentLinkText}>
                      However, you can{' '}
                      <a
                        href={officer_info.document_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.documentLink}
                      >
                        review the source documents here
                        <ExternalLink size={14} className={styles.externalIcon} />
                      </a>
                      {' '}to look for relevant supporting data.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'incident' && (
            <div className={styles.citationsList}>
              {csv_citations && csv_citations.length > 0 ? (
                csv_citations.map((citation, index) => (
                  <CitationCard key={index} citation={citation} type="incident" />
                ))
              ) : (
                <div className={styles.noCitations}>
                  <AlertTriangle size={24} />
                  <p>No incident date citations available.</p>
                  {officer_info.document_link && (
                    <p className={styles.documentLinkText}>
                      However, you can{' '}
                      <a
                        href={officer_info.document_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.documentLink}
                      >
                        review the source documents here
                        <ExternalLink size={14} className={styles.externalIcon} />
                      </a>
                      {' '}to look for relevant supporting data.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Disambiguation Section */}
      {other_officers_with_same_name.length > 0 && (() => {
        const groupedOfficers = groupOfficersByPostId(other_officers_with_same_name);
        const uniqueOfficerCount = groupedOfficers.length;

        return (
          <div className={styles.disambiguationSection}>
            <button
              onClick={() => setDisambiguationOpen(!disambiguationOpen)}
              className={styles.disambiguationToggle}
            >
              <span>
                Disambiguation ({uniqueOfficerCount} officer{uniqueOfficerCount !== 1 ? 's' : ''} with same name)
              </span>
              {disambiguationOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {disambiguationOpen && (
              <div className={styles.disambiguationContent}>
                {groupedOfficers.map((group, index) => (
                <div key={index} className={styles.disambiguationItem}>
                  <div className={styles.disambiguationHeader}>
                    <span className={styles.disambiguationName}>
                      {group.name}
                    </span>
                    <span className={styles.disambiguationPostId}>
                      POST ID: {group.postId}
                    </span>
                  </div>
                  <div className={styles.disambiguationTable}>
                    <EmploymentTable employments={group.employments} />
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Confirmation Dialog */}
      {confirmDialogOpen && (
        <div className={styles.dialogOverlay} onClick={() => setConfirmDialogOpen(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>
              Confirm {pendingAction === 'correct' ? 'Match' : pendingAction === 'incorrect' ? 'Rejection' : 'Review'}
            </h3>
            <p className={styles.dialogMessage}>
              Are you sure you want to mark this officer match as <strong>{pendingAction}</strong>?
            </p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes (optional)"
              className={styles.dialogNotes}
              rows={3}
            />

            <div className={styles.dialogActions}>
              <button
                onClick={() => setConfirmDialogOpen(false)}
                disabled={validateOfficer.isPending}
                className={styles.dialogCancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmValidation}
                disabled={validateOfficer.isPending}
                className={styles.dialogConfirmButton}
              >
                {validateOfficer.isPending ? (
                  <>
                    <Loader2 size={14} className={styles.buttonSpinner} />
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

// Helper: Employment Table
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
            <th>Start Date</th>
            <th>End Date</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {employments.map((emp, index) => {
            const durationDays = calculateDuration(emp.post_start_date, emp.post_end_date);
            return (
              <tr key={index}>
                <td>{emp.post_agency_name || 'N/A'}</td>
                <td>{formatDate(emp.post_start_date) || 'N/A'}</td>
                <td>{emp.post_end_date ? formatDate(emp.post_end_date) : 'Present'}</td>
                <td>
                  {durationDays
                    ? `${Math.floor(durationDays / 365)}y ${Math.floor((durationDays % 365) / 30)}m`
                    : 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Helper: Group officers by POST ID
function groupOfficersByPostId(employments: EmploymentHistory[]) {
  const groups = new Map<string, { name: string; postId: string; employments: EmploymentHistory[] }>();

  employments.forEach((emp) => {
    const postId = emp.post_person_nbr || 'Unknown';
    const name = `${emp.post_first_name || ''} ${emp.post_middle_name || ''} ${emp.post_last_name || ''}`.trim();

    if (!groups.has(postId)) {
      groups.set(postId, { name, postId, employments: [] });
    }
    groups.get(postId)!.employments.push(emp);
  });

  const result = Array.from(groups.values());
  console.log('Disambiguation grouping:', {
    totalEmployments: employments.length,
    uniqueOfficers: result.length,
    postIds: result.map(g => g.postId),
    groups: result,
  });
  return result;
}

