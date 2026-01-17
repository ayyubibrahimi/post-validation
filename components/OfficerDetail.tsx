'use client';

import { Lock, AlertTriangle, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { useOfficerDetail } from '@/hooks';
import Carousel from './Carousel';
import CitationCard from './CitationCard';
import type { EmploymentHistory } from '@/lib/types';
import styles from './OfficerDetail.module.scss';

interface OfficerDetailProps {
  mentionUid: string | null;
}

/**
 * OfficerDetail - Main content area showing full officer information
 *
 * Sections (vertically stacked with separators):
 * 1. Header Section: Input name, matched officer, probability, agency
 * 2. Matched Officer Employment History (table)
 * 3. Other Officers with Same Name (carousel)
 * 4. Citations (carousel)
 */
export default function OfficerDetail({ mentionUid }: OfficerDetailProps) {
  const { data: officer, isLoading } = useOfficerDetail(mentionUid);

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
  } = officer.data || {};

  // Safety check for officer_info
  if (!officer_info) {
    return (
      <div className={styles.emptyState}>
        <AlertTriangle size={48} className={styles.emptyIcon} />
        <h2>Invalid Officer Data</h2>
        <p>The officer data is missing or incomplete. Please try claiming another officer.</p>
      </div>
    );
  }

  const matchProbability = officer_info?.match_probability
    ? officer_info.match_probability * 100
    : 0;
  const matchColor =
    matchProbability >= 85
      ? styles.matchHigh
      : matchProbability >= 70
      ? styles.matchMedium
      : styles.matchLow;

  // Group other officers by POST ID
  const groupedOtherOfficers = other_officers_with_same_name.reduce((acc, emp) => {
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
    <div className={styles.container}>
      {/* Combined Officer Card - Input and Matched POST Officer */}
      <div className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div className={styles.headerContent}>
            <div className={styles.inputSection}>
              <div className={styles.label}>Input Officer Name</div>
              <div className={styles.inputName}>
                {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
              </div>
              <div className={styles.caseId}>Case: {officer_info.provisional_case_name}</div>
            </div>

            <div className={styles.matchedSection}>
              <div className={styles.label}>Matched POST Officer</div>
              <div className={styles.officerName}>
                {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
              </div>
              <div className={styles.postId}>POST ID: {officer_info.matched_post_id}</div>
            </div>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.probability}>
              <span className={styles.label}>Match Probability</span>
              <div className={`${styles.probabilityValue} ${matchColor}`}>
                {matchProbability.toFixed(1)}%
              </div>
            </div>
            <div className={styles.lockIndicator}>
              <Lock size={16} />
              <span>Assigned</span>
            </div>
          </div>
        </div>

        <div className={styles.agency}>
          <span className={styles.label}>Agency</span>
          <div className={styles.agencyName}>{officer_info.matched_agency}</div>
        </div>

        <div className={styles.employmentSection}>
          <h3 className={styles.subsectionTitle}>Employment History</h3>
          {matched_officer_employment_history.length > 0 ? (
            <EmploymentTable employments={matched_officer_employment_history} isMatched={true} />
          ) : (
            <div className={styles.noData}>No employment history available</div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className={styles.separator} />

      {/* Citations - Carousel (moved up) */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Citations ({citations.length})
          {citations.length === 0 && (
            <span className={styles.warningBadge}>
              <AlertTriangle size={14} />
              No citations - verify manually
            </span>
          )}
        </h2>

        {citations.length > 0 ? (
          <Carousel
            items={citations}
            renderItem={(citation) => <CitationCard citation={citation} />}
            emptyState={null}
          />
        ) : (
          <div className={styles.noCitations}>
            <AlertTriangle size={24} className={styles.warningIcon} />
            <p>No citations found for this officer.</p>
            {officer_info.document_link && (
              <a
                href={officer_info.document_link}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.documentLink}
              >
                Manually verify by checking the documents at this link
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Employment Table Component
function EmploymentTable({
  employments,
  isMatched,
}: {
  employments: EmploymentHistory[] | undefined;
  isMatched: boolean;
}) {
  const safeEmployments = employments || [];

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
          {safeEmployments.length > 0 ? (
            safeEmployments.map((emp, index) => {
              const durationDays = calculateDuration(emp.post_start_date, emp.post_end_date);
              return (
                <tr key={index} className={isMatched ? styles.matchedRow : ''}>
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
              <td
                colSpan={4}
                style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}
              >
                No employment history available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
