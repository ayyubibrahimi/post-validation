'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, ArrowRight, ChevronDown, ChevronUp, CheckCircle, XCircle, Eye, Pencil, Plus, X } from 'lucide-react';
import { useOfficerDetail, useValidateOfficer } from '@/hooks';
import CitationCard from './CitationCard';
import type { EmploymentHistory, CustomCitation, Citation, IncidentCitation, OfficerValidationData } from '@/lib/types';
import { nameCmp, agencyCmp, incidentCmp, stintsAt, normAgency, isoDay, type Cmp } from '@/lib/compare';
import styles from './OfficerDetail.module.scss';

interface OfficerDetailProps {
  mentionUid: string | null;
  validatorId: string;
  onValidationComplete: () => void;
}

type Verdict = 'correct' | 'incorrect' | 'needs_review';

const VERDICTS: { v: Verdict; key: string; label: string; meaning: string; className: string; Icon: typeof CheckCircle }[] = [
  {
    v: 'correct',
    key: '1',
    label: 'Yes, same person',
    meaning: 'The officer extracted from the case documents matches the person in POST.',
    className: 'confirmButton',
    Icon: CheckCircle,
  },
  {
    v: 'incorrect',
    key: '2',
    label: 'No, wrong person',
    meaning: 'The officer extracted from the case documents is a different person from the one in POST.',
    className: 'rejectButton',
    Icon: XCircle,
  },
  {
    v: 'needs_review',
    key: '3',
    label: 'Unclear',
    meaning: 'The evidence is too thin or conflicting to decide.',
    className: 'reviewButton',
    Icon: Eye,
  },
];

/**
 * OfficerDetail
 *
 * Layout (the order is the rubric):
 * 1. One comparison card: extracted vs POST, one row per comparable field, painted on
 *    both sides at once (green agree, red clearly disagree, plain proves nothing).
 *    The full POST employment history sits full width beneath it, and the ruling
 *    closes the card.
 * 2. Incident date citations, then employing agency citations.
 * 3. Others with this exact name (collapsed, with a count).
 *
 * When the ruling card scrolls out of view a sticky bar carries the same buttons, and
 * 1 / 2 / 3 record a verdict from anywhere on the page.
 */
export default function OfficerDetail({ mentionUid, validatorId, onValidationComplete }: OfficerDetailProps) {
  const { data: officer, isLoading } = useOfficerDetail(mentionUid);

  // Empty state
  if (!mentionUid || !officer) {
    return (
      <div className={styles.emptyState}>
        <ArrowRight size={48} className={styles.emptyIcon} />
        <h2 className={styles.emptyTitle}>Ready to Begin</h2>
        <p className={styles.emptyDescription}>
          Select an officer from the list on the left to start validating matches
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

  // Safety check
  if (!officer.data?.officer_info) {
    return (
      <div className={styles.emptyState}>
        <AlertTriangle size={48} className={styles.emptyIcon} />
        <h2>Invalid Officer Data</h2>
        <p>The officer data is missing or incomplete. Please select another officer.</p>
      </div>
    );
  }

  return (
    <OfficerReview
      mentionUid={mentionUid}
      data={officer.data}
      validatorId={validatorId}
      onValidationComplete={onValidationComplete}
    />
  );
}

function OfficerReview({
  mentionUid,
  data,
  validatorId,
  onValidationComplete,
}: {
  mentionUid: string;
  data: OfficerValidationData;
  validatorId: string;
  onValidationComplete: () => void;
}) {
  const validateOfficer = useValidateOfficer();

  const [othersOpen, setOthersOpen] = useState(false);

  // Officer-level notes
  const [notes, setNotes] = useState('');
  const [officerMatchNotes, setOfficerMatchNotes] = useState('');

  // Per-section notes
  const [agencyCitationNotes, setAgencyCitationNotes] = useState('');
  const [incidentDateNotes, setIncidentDateNotes] = useState('');

  // Inline corrections
  const [editingIncidentDate, setEditingIncidentDate] = useState(false);
  const [correctedIncidentDate, setCorrectedIncidentDate] = useState('');
  const [editingAgency, setEditingAgency] = useState(false);
  const [correctedAgency, setCorrectedAgency] = useState('');

  // Custom citations
  const [customCitations, setCustomCitations] = useState<CustomCitation[]>([]);

  // Sticky ruling bar: shown only while the ruling card is off screen, so the two
  // sets of buttons are never both visible.
  const rulingRef = useRef<HTMLDivElement>(null);
  const [rulingVisible, setRulingVisible] = useState(true);

  useEffect(() => {
    const el = rulingRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setRulingVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const {
    officer_info,
    matched_officer_employment_history = [],
    other_officers_with_same_name = [],
    citations = [],
    csv_incident_date,
    csv_citations,
    validation,
  } = data;

  const history = matched_officer_employment_history;
  // Name parts come from the POST record itself, not from officer_info, which holds
  // the extracted name.
  const postPerson = history[0];

  const agency = correctedAgency || officer_info.matched_agency;
  const incidentDate = correctedIncidentDate || csv_incident_date || '';
  const agencyStints = stintsAt(history, agency);
  const incident = incidentCmp(incidentDate, agencyStints);

  const cmp = {
    first: nameCmp(officer_info.first_name, postPerson?.post_first_name),
    middle: nameCmp(officer_info.middle_name, postPerson?.post_middle_name),
    last: nameCmp(officer_info.last_name, postPerson?.post_last_name),
    suffix: nameCmp(null, postPerson?.post_suffix),
    agency: agencyCmp(agency, history),
    incident: incident.state,
  };

  const formatLongDate = (dateString: string | null | undefined) => {
    const day = isoDay(dateString);
    if (!day) return null;
    const date = new Date(`${day}T00:00:00`);
    if (isNaN(date.getTime())) return dateString ?? null;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const stintSpan = (s: EmploymentHistory) =>
    `${isoDay(s.post_start_date) || '?'} to ${s.post_end_date ? isoDay(s.post_end_date) : 'present'}`;

  const fullName = (...parts: (string | null | undefined)[]) =>
    parts.map((p) => (p ?? '').trim()).filter(Boolean).join(' ');
  const postName =
    fullName(postPerson?.post_first_name, postPerson?.post_middle_name, postPerson?.post_last_name, postPerson?.post_suffix) ||
    fullName(officer_info.first_name, officer_info.middle_name, officer_info.last_name);

  // One sentence under the history: does the incident date fall within their
  // employment at the extracted agency? Wording follows the comparison verdict.
  const incidentLong = formatLongDate(incidentDate);
  const incidentSentence = !incidentLong
    ? null
    : !incident.stint
      ? `No employment at ${agency || 'the extracted agency'} in POST to check the incident date (${incidentLong}) against.`
      : incident.state === 'match'
        ? `The incident date (${incidentLong}) overlaps with their employment at ${incident.stint.post_agency_name} (${stintSpan(incident.stint)}).`
        : incident.state === 'compatible'
          ? `The incident date (${incidentLong}) falls just outside their employment at ${incident.stint.post_agency_name} (${stintSpan(incident.stint)}), within a year.`
          : `The incident date (${incidentLong}) falls outside their employment at ${incident.stint.post_agency_name} (${stintSpan(incident.stint)}).`;

  const handleDecide = (status: Verdict) => {
    if (validateOfficer.isPending) return;

    const hasCorrections = correctedIncidentDate.trim() || correctedAgency.trim();

    validateOfficer.mutate(
      {
        mentionUid,
        validatorId,
        status,
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
        onSuccess: () => onValidationComplete(),
        onError: (error) => console.error('Validation failed:', error),
      }
    );
  };

  // Keyboard: 1 / 2 / 3 record a verdict. Ignored while typing or with a modifier.
  // Re-subscribes each render so the handler always sees the current notes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      const verdict = VERDICTS.find((x) => x.key === e.key);
      if (verdict) {
        e.preventDefault();
        handleDecide(verdict.v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const currentStatus = validation?.status;

  const addCustomCitation = (c: CustomCitation) => setCustomCitations((prev) => [...prev, c]);
  const removeCustomCitation = (c: CustomCitation) => setCustomCitations((prev) => prev.filter((x) => x !== c));

  // Others with this exact name: anyone with a stint at the extracted agency first.
  const agencyKey = normAgency(agency);
  const others = groupOfficersByPostId(other_officers_with_same_name)
    .filter((g) => g.postId !== officer_info.matched_post_id)
    .sort((a, b) => Number(b.employments.some((e) => normAgency(e.post_agency_name) === agencyKey))
      - Number(a.employments.some((e) => normAgency(e.post_agency_name) === agencyKey)));

  return (
    <div className={styles.container}>
      {/* ---------- The comparison card ---------- */}
      <div className={styles.recordCard}>
        <div className={styles.compare}>
          <span />
          <h3 className={styles.colTitle}>
            Extracted from case documents
            <span className={styles.colSub}>
              Case Number: <code>{officer_info.provisional_case_name}</code>
            </span>
          </h3>
          <h3 className={`${styles.colTitle} ${styles.colPost}`}>
            Matched in POST
          </h3>

          <Pair label="First name" a={officer_info.first_name} b={postPerson?.post_first_name} cmp={cmp.first} />
          <Pair label="Middle name" a={officer_info.middle_name} b={postPerson?.post_middle_name} cmp={cmp.middle} />
          <Pair label="Last name" a={officer_info.last_name} b={postPerson?.post_last_name} cmp={cmp.last} />
          {cmp.suffix && <Pair label="Suffix" a={null} b={postPerson?.post_suffix} cmp={cmp.suffix} />}

          <Pair
            label="Employing agency"
            cmp={cmp.agency}
            a={
              editingAgency ? (
                <span className={styles.correctionField}>
                  <input
                    type="text"
                    value={correctedAgency}
                    onChange={(e) => setCorrectedAgency(e.target.value)}
                    className={styles.correctionInput}
                    placeholder="Corrected agency name"
                    autoFocus
                  />
                  <button className={styles.correctionSave} onClick={() => setEditingAgency(false)}>Done</button>
                </span>
              ) : (
                <span className={styles.editable}>
                  {agency || <span className={styles.blank}>—</span>}
                  {correctedAgency && correctedAgency !== officer_info.matched_agency && (
                    <span className={styles.correctedBadge}>corrected</span>
                  )}
                  <button
                    className={styles.editFieldButton}
                    onClick={() => { setEditingAgency(true); setCorrectedAgency(correctedAgency || officer_info.matched_agency); }}
                    title="Correct this value"
                  >
                    <Pencil size={12} />
                  </button>
                </span>
              )
            }
            b={agencyStints[0]?.post_agency_name ?? (agency ? <span className={styles.blank}>Not in POST history</span> : null)}
          />

          <Pair
            label="Incident date"
            cmp={cmp.incident}
            a={
              editingIncidentDate ? (
                <span className={styles.correctionField}>
                  <input
                    type="date"
                    value={correctedIncidentDate}
                    onChange={(e) => setCorrectedIncidentDate(e.target.value)}
                    className={styles.correctionInput}
                    autoFocus
                  />
                  <button className={styles.correctionSave} onClick={() => setEditingIncidentDate(false)}>Done</button>
                </span>
              ) : (
                <span className={styles.editable}>
                  {formatLongDate(incidentDate) || <span className={styles.blank}>—</span>}
                  {correctedIncidentDate && correctedIncidentDate !== csv_incident_date && (
                    <span className={styles.correctedBadge}>corrected</span>
                  )}
                  <button
                    className={styles.editFieldButton}
                    onClick={() => { setEditingIncidentDate(true); setCorrectedIncidentDate(correctedIncidentDate || csv_incident_date || ''); }}
                    title="Correct this value"
                  >
                    <Pencil size={12} />
                  </button>
                </span>
              )
            }
            b={incidentSentence}
          />
        </div>

        {officer_info.mentioned_agencies && officer_info.mentioned_agencies !== 'None' && (
          <div className={styles.contextLine}>
            <span>Agencies mentioned: {officer_info.mentioned_agencies}</span>
          </div>
        )}

        {/* Full width, below both: it has no extracted counterpart. */}
        <div className={styles.careerWrap}>
          <h3 className={styles.careerTitle}>
            {postName}&apos;s (POST ID: <code>{officer_info.matched_post_id}</code>) Full Employment History in POST
          </h3>
          {history.length > 0 ? (
            <EmploymentTable employments={history} highlightAgency={agency} />
          ) : (
            <p className={styles.none}>None</p>
          )}
        </div>

        {/* ---------- The ruling closes the card ---------- */}
        <div ref={rulingRef} className={styles.ruling}>
          <h3 className={styles.rulingQuestion}>
            Is this the same person as POST <code>{officer_info.matched_post_id}</code>?
          </h3>

          <div className={styles.rulingNotes}>
            <textarea
              value={officerMatchNotes}
              onChange={(e) => setOfficerMatchNotes(e.target.value)}
              placeholder="Notes on the officer match..."
              className={styles.caseNotesTextarea}
              rows={2}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="General notes about this case..."
              className={styles.caseNotesTextarea}
              rows={2}
            />
          </div>

          <div className={styles.actionsSection}>
            {VERDICTS.map(({ v, key, label, meaning, className, Icon }) => (
              <div key={v} className={styles.actionCell}>
                <button
                  onClick={() => handleDecide(v)}
                  disabled={validateOfficer.isPending}
                  className={`${styles.actionButton} ${styles[className]}`}
                  data-active={currentStatus === v ? '1' : undefined}
                >
                  <Icon size={18} />
                  <kbd className={styles.kbd}>{key}</kbd>
                  {label}
                </button>
                <p className={styles.meaning}>{meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Citations ---------- */}
      <CitationSection
        title="Incident Date Citations"
        type="incident"
        citations={csv_citations ?? []}
        custom={customCitations.filter((c) => c.type === 'incident')}
        onAdd={addCustomCitation}
        onRemove={removeCustomCitation}
        notes={incidentDateNotes}
        onNotes={setIncidentDateNotes}
        notesPlaceholder="Notes on incident date..."
        validatorId={validatorId}
      />

      <CitationSection
        title="Employing Agency Citations"
        type="agency"
        citations={citations}
        custom={customCitations.filter((c) => c.type === 'agency')}
        onAdd={addCustomCitation}
        onRemove={removeCustomCitation}
        notes={agencyCitationNotes}
        onNotes={setAgencyCitationNotes}
        notesPlaceholder="Notes on employing agency..."
        validatorId={validatorId}
      />

      {/* ---------- Others with this exact name ---------- */}
      <div className={styles.disambiguationSection}>
        <div className={styles.citationsSectionHeader}>Others with this exact name</div>
        {others.length === 0 ? (
          <p className={styles.none}>None</p>
        ) : (
          <>
            <button onClick={() => setOthersOpen(!othersOpen)} className={styles.disambiguationToggle}>
              <span>
                {othersOpen ? 'Hide' : `Show ${others.length} other${others.length === 1 ? '' : 's'} with this name`}
              </span>
              {othersOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {othersOpen && (
              <div className={styles.disambiguationContent}>
                {others.map((group) => (
                  <div key={group.postId} className={styles.disambiguationItem}>
                    <div className={styles.disambiguationHeader}>
                      <span className={styles.disambiguationName}>{group.name}</span>
                      <span className={styles.disambiguationPostId}>{group.postId}</span>
                    </div>
                    <div className={styles.disambiguationTable}>
                      <EmploymentTable employments={group.employments} highlightAgency={agency} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- Sticky ruling bar ---------- */}
      {!rulingVisible && (
        <div className={styles.rulingBar} role="toolbar" aria-label="Ruling">
          <span className={styles.rulingBarWho}>
            {officer_info.first_name} {officer_info.middle_name} {officer_info.last_name}
            {' · '}<code>{officer_info.matched_post_id}</code>
          </span>
          <div className={styles.rulingBarButtons}>
            {VERDICTS.map(({ v, key, label, className, Icon }) => (
              <button
                key={v}
                onClick={() => handleDecide(v)}
                disabled={validateOfficer.isPending}
                className={`${styles.actionButton} ${styles[className]}`}
                data-active={currentStatus === v ? '1' : undefined}
              >
                <Icon size={16} />
                <kbd className={styles.kbd}>{key}</kbd>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// One comparison row: label | extracted | POST, the verdict painted on both values.
function Pair({ label, a, b, cmp }: { label: string; a: React.ReactNode; b: React.ReactNode; cmp: Cmp }) {
  const state = cmp ?? undefined;
  return (
    <>
      <span className={styles.pairLabel} data-state={state}>{label}</span>
      <span className={styles.pairValue} data-state={state}>
        {a || <span className={styles.blank}>—</span>}
      </span>
      <span className={`${styles.pairValue} ${styles.pairPost}`} data-state={state}>
        {b || <span className={styles.blank}>—</span>}
      </span>
    </>
  );
}

function CitationSection({
  title,
  type,
  citations,
  custom,
  onAdd,
  onRemove,
  notes,
  onNotes,
  notesPlaceholder,
  validatorId,
}: {
  title: string;
  type: 'agency' | 'incident';
  citations: (Citation | IncidentCitation)[];
  custom: CustomCitation[];
  onAdd: (c: CustomCitation) => void;
  onRemove: (c: CustomCitation) => void;
  notes: string;
  onNotes: (s: string) => void;
  notesPlaceholder: string;
  validatorId: string;
}) {
  const [adding, setAdding] = useState(false);
  const [quote, setQuote] = useState('');
  const [file, setFile] = useState('');
  const [page, setPage] = useState('');
  const [url, setUrl] = useState('');

  const save = () => {
    if (!quote.trim()) return;
    onAdd({
      type,
      quote: quote.trim(),
      file_name: file.trim() || 'Manual entry',
      page_number: parseInt(page) || 0,
      url: url.trim() || undefined,
      added_by: validatorId,
      added_at: new Date().toISOString(),
    });
    setAdding(false);
    setQuote('');
    setFile('');
    setPage('');
    setUrl('');
  };

  return (
    <div className={styles.citationsSection}>
      <div className={styles.citationsSectionHeader}>
        {title} ({citations.length + custom.length})
      </div>
      <div className={styles.citationsContent}>
        <div className={styles.citationsList}>
          {citations.length === 0 && custom.length === 0 && <p className={styles.none}>None</p>}
          {citations.map((citation, index) => (
            <CitationCard key={index} citation={citation} type={type} />
          ))}
          {custom.map((c, i) => (
            <div key={`custom-${type}-${i}`} className={styles.customCitationCard}>
              <div className={styles.customCitationHeader}>
                <span className={styles.customBadge}>Added by {c.added_by}</span>
                <button className={styles.removeCitationButton} onClick={() => onRemove(c)}><X size={12} /></button>
              </div>
              <p className={styles.customCitationQuote}>{c.quote}</p>
              <span className={styles.customCitationMeta}>{c.file_name}{c.page_number ? ` · Page ${c.page_number}` : ''}</span>
            </div>
          ))}
          {adding ? (
            <div className={styles.addCitationForm}>
              <textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Quote from document..." className={styles.addCitationTextarea} rows={3} autoFocus />
              <div className={styles.addCitationRow}>
                <input type="text" value={file} onChange={(e) => setFile(e.target.value)} placeholder="File name" className={styles.addCitationInput} />
                <input type="number" value={page} onChange={(e) => setPage(e.target.value)} placeholder="Page #" className={`${styles.addCitationInput} ${styles.addCitationInputSmall}`} />
              </div>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link to document (optional)" className={styles.addCitationInput} />
              <div className={styles.addCitationActions}>
                <button className={styles.addCitationCancel} onClick={() => setAdding(false)}>Cancel</button>
                <button className={styles.addCitationSave} onClick={save} disabled={!quote.trim()}>Add Citation</button>
              </div>
            </div>
          ) : (
            <button className={styles.addCitationButton} onClick={() => setAdding(true)}><Plus size={14} />Add Citation</button>
          )}
          <textarea value={notes} onChange={(e) => onNotes(e.target.value)} placeholder={notesPlaceholder} className={styles.sectionNotesTextarea} rows={2} />
        </div>
      </div>
    </div>
  );
}

// Employment table; stints at the extracted agency are tinted.
function EmploymentTable({ employments, highlightAgency }: { employments: EmploymentHistory[]; highlightAgency?: string }) {
  const key = normAgency(highlightAgency);

  const duration = (startDate: string | undefined, endDate: string | null | undefined) => {
    if (!startDate) return null;
    const start = new Date(isoDay(startDate));
    const end = endDate ? new Date(isoDay(endDate)) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`;
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
            <th>Separation</th>
          </tr>
        </thead>
        <tbody>
          {employments.map((emp, index) => (
            <tr key={index} className={key && normAgency(emp.post_agency_name) === key ? styles.hereRow : undefined}>
              <td>{emp.post_agency_name || 'N/A'}</td>
              <td>{isoDay(emp.post_start_date) || 'N/A'}</td>
              <td>{emp.post_end_date ? isoDay(emp.post_end_date) : 'Present'}</td>
              <td>{duration(emp.post_start_date, emp.post_end_date) ?? 'N/A'}</td>
              <td>{emp.post_separation_reason || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Group a flat list of employment rows into one entry per POST person.
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

  return Array.from(groups.values());
}
