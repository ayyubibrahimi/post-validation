'use client';

import { useState } from 'react';
import { Lock, AlertTriangle, Loader2, ArrowRight, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, ExternalLink, Pencil, Plus, X } from 'lucide-react';
import { useOfficerDetail, useValidateOfficer } from '@/hooks';
import CitationCard from './CitationCard';
import type { EmploymentHistory, CustomCitation } from '@/lib/types';
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
 * 3. Stacked citations (Incident Date, then Employing Agency)
 * 4. Collapsible disambiguation section
 */
export default function OfficerDetail({ mentionUid, validatorId, onValidationComplete }: OfficerDetailProps) {
  const { data: officer, isLoading } = useOfficerDetail(mentionUid);
  const validateOfficer = useValidateOfficer();

  const [disambiguationOpen, setDisambiguationOpen] = useState(false);

  // Case notes (global)
  const [notes, setNotes] = useState('');

  // Per-section notes
  const [officerMatchNotes, setOfficerMatchNotes] = useState('');
  const [agencyCitationNotes, setAgencyCitationNotes] = useState('');
  const [incidentDateNotes, setIncidentDateNotes] = useState('');

  // Inline corrections
  const [editingIncidentDate, setEditingIncidentDate] = useState(false);
  const [correctedIncidentDate, setCorrectedIncidentDate] = useState('');
  const [editingAgency, setEditingAgency] = useState(false);
  const [correctedAgency, setCorrectedAgency] = useState('');

  // Custom citations
  const [customCitations, setCustomCitations] = useState<CustomCitation[]>([]);
  const [addingCitationFor, setAddingCitationFor] = useState<'agency' | 'incident' | null>(null);
  const [newCitationQuote, setNewCitationQuote] = useState('');
  const [newCitationFile, setNewCitationFile] = useState('');
  const [newCitationPage, setNewCitationPage] = useState('');
  const [newCitationUrl, setNewCitationUrl] = useState('');

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


  // Handle validation
  const handleValidationClick = (status: 'correct' | 'incorrect' | 'needs_review') => {
    setPendingAction(status);
    setConfirmDialogOpen(true);
  };

  const handleConfirmValidation = () => {
    if (!pendingAction) return;

    const hasCorrections = correctedIncidentDate.trim() || correctedAgency.trim();

    validateOfficer.mutate(
      {
        mentionUid: mentionUid!,
        validatorId,
        status: pendingAction,
        notes: notes.trim() || undefined,
        officer_match_notes: officerMatchNotes.trim() || undefined,
        agency_citation_notes: agencyCitationNotes.trim() || undefined,
        incident_date_notes: incidentDateNotes.trim() || undefined,
        corrections: hasCorrections ? {
          incident_date: correctedIncidentDate.trim() || null,
          employing_agency: correctedAgency.trim() || null,
        } : undefined,
        custom_citations: customCitations.length > 0 ? customCitations : undefined,
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

  const handleAddCustomCitation = () => {
    if (!newCitationQuote.trim() || !addingCitationFor) return;
    const citation: CustomCitation = {
      type: addingCitationFor,
      quote: newCitationQuote.trim(),
      file_name: newCitationFile.trim() || 'Manual entry',
      page_number: parseInt(newCitationPage) || 0,
      url: newCitationUrl.trim() || undefined,
      added_by: validatorId,
      added_at: new Date().toISOString(),
    };
    setCustomCitations(prev => [...prev, citation]);
    setAddingCitationFor(null);
    setNewCitationQuote('');
    setNewCitationFile('');
    setNewCitationPage('');
    setNewCitationUrl('');
  };

  return (
    <div className={styles.container}>
      {/* Split Comparison */}
      <div className={styles.comparisonSection}>
        {/* Left: Input Officer */}
        <div className={styles.inputPanel}>
          <h3 className={styles.panelTitle}>Reviewed Officer</h3>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Name (extracted)</label>
            <div className={styles.fieldValue}>
              {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Employing Agency (extracted)
              <button
                className={styles.editFieldButton}
                onClick={() => { setEditingAgency(!editingAgency); setCorrectedAgency(correctedAgency || officer_info.matched_agency); }}
                title="Correct this value"
              >
                <Pencil size={12} />
              </button>
            </label>
            {editingAgency ? (
              <div className={styles.correctionField}>
                <input
                  type="text"
                  value={correctedAgency}
                  onChange={(e) => setCorrectedAgency(e.target.value)}
                  className={styles.correctionInput}
                  placeholder="Enter corrected agency name"
                />
                <button className={styles.correctionSave} onClick={() => setEditingAgency(false)}>Save</button>
              </div>
            ) : (
              <div className={styles.fieldValue}>
                {correctedAgency || officer_info.matched_agency}
                {correctedAgency && correctedAgency !== officer_info.matched_agency && (
                  <span className={styles.correctedBadge}>corrected</span>
                )}
              </div>
            )}
          </div>

          {csv_incident_date && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>
                Incident Date (extracted)
                <button
                  className={styles.editFieldButton}
                  onClick={() => { setEditingIncidentDate(!editingIncidentDate); setCorrectedIncidentDate(correctedIncidentDate || csv_incident_date || ''); }}
                  title="Correct this value"
                >
                  <Pencil size={12} />
                </button>
              </label>
              {editingIncidentDate ? (
                <div className={styles.correctionField}>
                  <input
                    type="date"
                    value={correctedIncidentDate}
                    onChange={(e) => setCorrectedIncidentDate(e.target.value)}
                    className={styles.correctionInput}
                  />
                  <button className={styles.correctionSave} onClick={() => setEditingIncidentDate(false)}>Save</button>
                </div>
              ) : (
                <div className={styles.fieldValue}>
                  {correctedIncidentDate
                    ? formatIncidentDate(correctedIncidentDate)
                    : formatIncidentDate(csv_incident_date)}
                  {correctedIncidentDate && correctedIncidentDate !== csv_incident_date && (
                    <span className={styles.correctedBadge}>corrected</span>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.fieldLabel}>All Agencies Mentioned in Case Documents</label>
            <div className={styles.fieldValueMuted}>
              {officer_info.mentioned_agencies || 'None'}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Case ID</label>
            <div className={styles.caseId}>{officer_info.provisional_case_name}</div>
          </div>
        </div>

{/* Right: Matched POST Officer */}
        <div className={styles.matchedPanel}>
          <div className={styles.matchedHeader}>
            <h3 className={styles.panelTitle}>Matched Officer</h3>
            <div className={styles.lockIndicator}>
              <Lock size={12} />
              <span>Assigned</span>
            </div>
          </div>

          <div className={styles.matchedInfo}>
            <div className={styles.matchedName}>
              {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
            </div>
            <div className={styles.postId}>ID: {officer_info.matched_post_id}</div>
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
          Yes
        </button>

        <button
          onClick={() => handleValidationClick('incorrect')}
          disabled={validateOfficer.isPending}
          className={`${styles.actionButton} ${styles.rejectButton}`}
        >
          <XCircle size={18} />
          No
        </button>

        <button
          onClick={() => handleValidationClick('needs_review')}
          disabled={validateOfficer.isPending}
          className={`${styles.actionButton} ${styles.reviewButton}`}
        >
          <Eye size={18} />
          Unclear
        </button>
      </div>

      {/* Incident Date Citations */}
      <div className={styles.citationsSection}>
        <div className={styles.citationsSectionHeader}>
          Incident Date Citations ({(csv_citations?.length ?? 0) + customCitations.filter(c => c.type === 'incident').length})
        </div>
        <div className={styles.citationsContent}>
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
                    You can{' '}
                    <a href={officer_info.document_link} target="_blank" rel="noopener noreferrer" className={styles.documentLink}>
                      review the source documents here
                      <ExternalLink size={14} className={styles.externalIcon} />
                    </a>
                    {' '}to look for relevant supporting data.
                  </p>
                )}
              </div>
            )}
            {customCitations.filter(c => c.type === 'incident').map((c, i) => (
              <div key={`custom-incident-${i}`} className={styles.customCitationCard}>
                <div className={styles.customCitationHeader}>
                  <span className={styles.customBadge}>Added by {c.added_by}</span>
                  <button className={styles.removeCitationButton} onClick={() => setCustomCitations(prev => prev.filter((_, idx) => !(prev[idx].type === 'incident' && prev.filter(x => x.type === 'incident').indexOf(prev[idx]) === i)))}><X size={12} /></button>
                </div>
                <p className={styles.customCitationQuote}>{c.quote}</p>
                <span className={styles.customCitationMeta}>{c.file_name}{c.page_number ? ` · Page ${c.page_number}` : ''}</span>
              </div>
            ))}
            {addingCitationFor === 'incident' ? (
              <div className={styles.addCitationForm}>
                <textarea value={newCitationQuote} onChange={(e) => setNewCitationQuote(e.target.value)} placeholder="Quote from document..." className={styles.addCitationTextarea} rows={3} autoFocus />
                <div className={styles.addCitationRow}>
                  <input type="text" value={newCitationFile} onChange={(e) => setNewCitationFile(e.target.value)} placeholder="File name" className={styles.addCitationInput} />
                  <input type="number" value={newCitationPage} onChange={(e) => setNewCitationPage(e.target.value)} placeholder="Page #" className={`${styles.addCitationInput} ${styles.addCitationInputSmall}`} />
                </div>
                <input type="url" value={newCitationUrl} onChange={(e) => setNewCitationUrl(e.target.value)} placeholder="Link to document (optional)" className={styles.addCitationInput} />
                <div className={styles.addCitationActions}>
                  <button className={styles.addCitationCancel} onClick={() => setAddingCitationFor(null)}>Cancel</button>
                  <button className={styles.addCitationSave} onClick={handleAddCustomCitation} disabled={!newCitationQuote.trim()}>Add Citation</button>
                </div>
              </div>
            ) : (
              <button className={styles.addCitationButton} onClick={() => setAddingCitationFor('incident')}><Plus size={14} />Add Citation</button>
            )}
            <textarea value={incidentDateNotes} onChange={(e) => setIncidentDateNotes(e.target.value)} placeholder="Notes on incident date..." className={styles.sectionNotesTextarea} rows={2} />
          </div>
        </div>
      </div>

      {/* Employing Agency Citations */}
      <div className={styles.citationsSection}>
        <div className={styles.citationsSectionHeader}>
          Employing Agency Citations ({citations.length + customCitations.filter(c => c.type === 'agency').length})
        </div>
        <div className={styles.citationsContent}>
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
                    You can{' '}
                    <a href={officer_info.document_link} target="_blank" rel="noopener noreferrer" className={styles.documentLink}>
                      review the source documents here
                      <ExternalLink size={14} className={styles.externalIcon} />
                    </a>
                    {' '}to look for relevant supporting data.
                  </p>
                )}
              </div>
            )}
            {customCitations.filter(c => c.type === 'agency').map((c, i) => (
              <div key={`custom-agency-${i}`} className={styles.customCitationCard}>
                <div className={styles.customCitationHeader}>
                  <span className={styles.customBadge}>Added by {c.added_by}</span>
                  <button className={styles.removeCitationButton} onClick={() => setCustomCitations(prev => prev.filter((_, idx) => !(prev[idx].type === 'agency' && prev.filter(x => x.type === 'agency').indexOf(prev[idx]) === i)))}><X size={12} /></button>
                </div>
                <p className={styles.customCitationQuote}>{c.quote}</p>
                <span className={styles.customCitationMeta}>{c.file_name}{c.page_number ? ` · Page ${c.page_number}` : ''}</span>
              </div>
            ))}
            {addingCitationFor === 'agency' ? (
              <div className={styles.addCitationForm}>
                <textarea value={newCitationQuote} onChange={(e) => setNewCitationQuote(e.target.value)} placeholder="Quote from document..." className={styles.addCitationTextarea} rows={3} autoFocus />
                <div className={styles.addCitationRow}>
                  <input type="text" value={newCitationFile} onChange={(e) => setNewCitationFile(e.target.value)} placeholder="File name" className={styles.addCitationInput} />
                  <input type="number" value={newCitationPage} onChange={(e) => setNewCitationPage(e.target.value)} placeholder="Page #" className={`${styles.addCitationInput} ${styles.addCitationInputSmall}`} />
                </div>
                <input type="url" value={newCitationUrl} onChange={(e) => setNewCitationUrl(e.target.value)} placeholder="Link to document (optional)" className={styles.addCitationInput} />
                <div className={styles.addCitationActions}>
                  <button className={styles.addCitationCancel} onClick={() => setAddingCitationFor(null)}>Cancel</button>
                  <button className={styles.addCitationSave} onClick={handleAddCustomCitation} disabled={!newCitationQuote.trim()}>Add Citation</button>
                </div>
              </div>
            ) : (
              <button className={styles.addCitationButton} onClick={() => setAddingCitationFor('agency')}><Plus size={14} />Add Citation</button>
            )}
            <textarea value={agencyCitationNotes} onChange={(e) => setAgencyCitationNotes(e.target.value)} placeholder="Notes on employing agency..." className={styles.sectionNotesTextarea} rows={2} />
          </div>
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
                {uniqueOfficerCount} officer{uniqueOfficerCount !== 1 ? 's' : ''} with the same name
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
                      ID: {group.postId}
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

      {/* Combined Notes */}
      <div className={styles.combinedNotesSection}>
        <div className={styles.combinedNotesField}>
          <label className={styles.sectionNotesLabel}>Officer Match Notes</label>
          <textarea
            value={officerMatchNotes}
            onChange={(e) => setOfficerMatchNotes(e.target.value)}
            placeholder="Notes on the officer match..."
            className={styles.caseNotesTextarea}
            rows={4}
          />
        </div>
        <div className={styles.combinedNotesDivider} />
        <div className={styles.combinedNotesField}>
          <label className={styles.sectionNotesLabel}>Case Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="General notes about this case..."
            className={styles.caseNotesTextarea}
            rows={4}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialogOpen && (
        <div className={styles.dialogOverlay} onClick={() => setConfirmDialogOpen(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>
              {pendingAction === 'correct' ? 'Confirm: Yes' : pendingAction === 'incorrect' ? 'Confirm: No' : 'Confirm: Unclear'}
            </h3>
            <p className={styles.dialogMessage}>
              Are you sure you want to mark this officer as <strong>{pendingAction === 'correct' ? 'Yes' : pendingAction === 'incorrect' ? 'No' : 'Unclear'}</strong>?
            </p>

            {notes.trim() && (
              <p className={styles.dialogNotePreview}>
                <strong>Notes:</strong> {notes.trim()}
              </p>
            )}

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

