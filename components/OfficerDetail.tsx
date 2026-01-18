'use client';

import { Lock, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
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

  return (
    <div className={styles.container}>
      {/* Officer Information Card */}
      <div className={styles.headerCard}>
        {/* Section 1: Input Officer Information (from case) */}
        <div className={styles.inputOfficerSection}>
          <h3 className={styles.sectionHeading}>Input Officer Information</h3>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.label}>Officer Name (from case)</div>
              <div className={styles.inputName}>
                {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.label}>Case ID</div>
              <div className={styles.caseId}>{officer_info.provisional_case_name}</div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.label}>Officer Matched to Agency</div>
              <div className={styles.agencyName}>{officer_info.matched_agency}</div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.label}>Agencies Mentioned in Case Documents</div>
              <div className={styles.mentionedAgencies}>
                {officer_info.mentioned_agencies || 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className={styles.sectionDivider} />

        {/* Section 2: Matched POST Officer (candidate) */}
        <div className={styles.matchedOfficerSection}>
          <div className={styles.matchedHeader}>
            <h3 className={styles.sectionHeading}>Matched POST Officer</h3>
            <div className={styles.lockIndicator}>
              <Lock size={14} />
              <span>Assigned</span>
            </div>
          </div>

          <div className={styles.matchedOfficerInfo}>
            <div className={styles.officerNameRow}>
              <div>
                <div className={styles.officerName}>
                  {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
                </div>
                <div className={styles.postId}>POST ID: {officer_info.matched_post_id}</div>
              </div>
              <div className={`${styles.probabilityBadge} ${matchColor}`}>
                {matchProbability.toFixed(1)}% match
              </div>
            </div>
          </div>

          <div className={styles.employmentSection}>
            <h4 className={styles.subsectionTitle}>Employment History</h4>
            {matched_officer_employment_history.length > 0 ? (
              <EmploymentTable employments={matched_officer_employment_history} isMatched={true} />
            ) : (
              <div className={styles.noData}>No employment history available</div>
            )}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className={styles.separator} />

      {/* Citations - Carousel (moved up) */}
      <div className={styles.sectionCard}>
        <h2 className={styles.sectionTitle}>
          Supporting Citations from Documents ({citations.length})
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
            controlsPosition="bottom"
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
