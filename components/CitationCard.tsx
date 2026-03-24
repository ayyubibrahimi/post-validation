'use client';

import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { Citation, IncidentCitation } from '@/lib/types';
import styles from './CitationCard.module.scss';

interface CitationCardProps {
  citation: Citation | IncidentCitation;
  type?: 'agency' | 'incident';
}

/**
 * CitationCard - Display individual citation evidence
 *
 * Content:
 * - Document quote (with agency name or date highlighted)
 * - File name
 * - Page number
 * - Agency name badge (for agency citations) or Incident badge (for incident citations)
 * - Link to PDF (opens in new tab with external link icon)
 *
 * Styling:
 * - Dark card with left accent border (teal for agency, blue for incident)
 * - Quote in larger text
 * - Metadata in muted color
 */
export default function CitationCard({ citation, type = 'agency' }: CitationCardProps) {
  // Normalize fields based on citation type
  const isAgencyCitation = 'file_name' in citation;
  const fileName = isAgencyCitation ? citation.file_name : citation.filename;
  const pdfUrl = isAgencyCitation ? citation.blob_url : citation.gdrive_url;
  const agencyName = isAgencyCitation ? citation.agency_name : null;
  const highlightAgencyName = (text: string, agencyName: string) => {
    if (!agencyName) return text;

    // Create a case-insensitive regex to find the agency name
    const regex = new RegExp(`(${agencyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === agencyName.toLowerCase()) {
        return (
          <span key={index} className={type === 'incident' ? styles.highlightedIncident : styles.highlighted}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const highlightDates = (text: string) => {
    // Highlight date patterns in the text (e.g., "January 2023", "2023-01-15", "01/15/2023")
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // MM/DD/YYYY or M/D/YY
      /\b\d{4}-\d{2}-\d{2}\b/g,         // YYYY-MM-DD
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, // Month DD, YYYY
      /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, // DD Month YYYY
    ];

    let result: (string | React.ReactElement)[] = [text];

    datePatterns.forEach((pattern) => {
      const newResult: (string | React.ReactElement)[] = [];
      result.forEach((part, idx) => {
        if (typeof part === 'string') {
          const matches = part.split(pattern);
          const dates = part.match(pattern) || [];
          matches.forEach((match, i) => {
            newResult.push(match);
            if (dates[i]) {
              newResult.push(
                <span key={`${idx}-${i}`} className={styles.highlightedIncident}>
                  {dates[i]}
                </span>
              );
            }
          });
        } else {
          newResult.push(part);
        }
      });
      result = newResult;
    });

    return result;
  };

  return (
    <div className={`${styles.card} ${type === 'incident' ? styles.incidentCard : ''}`}>
      {/* Quote */}
      <div className={styles.quote}>
        {type === 'incident'
          ? highlightDates(citation.quote)
          : agencyName
            ? highlightAgencyName(citation.quote, agencyName)
            : citation.quote
        }
      </div>

      {/* Metadata row */}
      <div className={styles.metadata}>
        <div className={styles.metadataLeft}>
          <FileText size={14} className={styles.fileIcon} />
          <span className={styles.fileName}>{fileName}</span>
          <span className={styles.separator}>•</span>
          <span className={styles.pageNumber}>Page {citation.page_number}</span>
        </div>

        {/* Badge - Agency or Incident */}
        {type === 'incident' ? (
          <div className={styles.incidentBadge}>Incident Date</div>
        ) : agencyName ? (
          <div className={styles.agencyBadge}>{agencyName}</div>
        ) : null}
      </div>

      {/* Validator Reasoning (only for incident citations) */}
      {type === 'incident' && 'validator_reasoning' in citation && citation.validator_reasoning && (
        <div className={styles.reasoning}>
          <span className={styles.reasoningLabel}>Reasoning:</span> {citation.validator_reasoning}
        </div>
      )}

      {/* PDF link */}
      {pdfUrl && (
        <div className={styles.linkSection}>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.pdfLink}
          >
            View {type === 'incident' ? 'Document' : 'PDF'}
            <ExternalLink size={14} className={styles.externalIcon} />
          </a>
        </div>
      )}
    </div>
  );
}
