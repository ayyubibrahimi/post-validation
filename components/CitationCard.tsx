'use client';

import React from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import type { Citation } from '@/lib/types';
import styles from './CitationCard.module.scss';

interface CitationCardProps {
  citation: Citation;
}

/**
 * CitationCard - Display individual citation evidence
 *
 * Content:
 * - Document quote (with agency name highlighted)
 * - File name
 * - Page number
 * - Agency name badge
 * - Link to PDF (opens in new tab with external link icon)
 *
 * Styling:
 * - Dark card with left teal accent border
 * - Quote in larger text
 * - Metadata in muted color
 */
export default function CitationCard({ citation }: CitationCardProps) {
  const highlightAgencyName = (text: string, agencyName: string) => {
    if (!agencyName) return text;

    // Create a case-insensitive regex to find the agency name
    const regex = new RegExp(`(${agencyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.toLowerCase() === agencyName.toLowerCase()) {
        return (
          <span key={index} className={styles.highlighted}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={styles.card}>
      {/* Quote */}
      <div className={styles.quote}>
        {highlightAgencyName(citation.quote, citation.agency_name)}
      </div>

      {/* Metadata row */}
      <div className={styles.metadata}>
        <div className={styles.metadataLeft}>
          <FileText size={14} className={styles.fileIcon} />
          <span className={styles.fileName}>{citation.file_name}</span>
          <span className={styles.separator}>•</span>
          <span className={styles.pageNumber}>Page {citation.page_number}</span>
        </div>

        {/* Agency badge */}
        {citation.agency_name && (
          <div className={styles.agencyBadge}>{citation.agency_name}</div>
        )}
      </div>

      {/* PDF link */}
      {citation.blob_url && (
        <div className={styles.linkSection}>
          <a
            href={citation.blob_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.pdfLink}
          >
            View PDF
            <ExternalLink size={14} className={styles.externalIcon} />
          </a>
        </div>
      )}
    </div>
  );
}
