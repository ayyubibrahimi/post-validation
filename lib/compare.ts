import type { EmploymentHistory } from './types';

/**
 * Field-by-field comparison of the extracted officer against the matched POST record.
 *
 * Three outcomes, painted on both values at once:
 *   match       the values agree                         green
 *   compatible  they differ, but the difference proves    no colour
 *               nothing (a blank side, an initial, dates
 *               within a year, a differently spelled agency)
 *   conflict    they clearly disagree                    red
 *
 * `null` means there was nothing to compare and renders plain. The middle state is
 * deliberately uncoloured: painting "proves nothing" amber makes most rows look like
 * warnings and teaches reviewers to ignore the colour.
 */
export type FieldState = 'match' | 'compatible' | 'conflict';
export type Cmp = FieldState | null;

const clean = (s: string | null | undefined) => (s ?? '').trim();
const letters = (s: string) => s.replace(/[^a-z]/gi, '').toLowerCase();

/** A name part (first, middle, last, suffix). */
export function nameCmp(extracted: string | null | undefined, post: string | null | undefined): Cmp {
  const a = clean(extracted);
  const b = clean(post);
  if (!a && !b) return null;
  if (!a || !b) return 'compatible';

  const A = letters(a);
  const B = letters(b);
  if (A === B) return 'match';

  // An initial against the full name it abbreviates: `S` vs `STEVEN`.
  if ((A.length === 1 || B.length === 1) && A[0] === B[0]) return 'compatible';
  // A shortened form: `NATHAN` vs `NATHANIEL`. Not proof, not a contradiction.
  if (A && B && (A.startsWith(B) || B.startsWith(A))) return 'compatible';

  // `MIKE` vs `MICHAEL` is red on purpose: usually the same person, but that is the
  // reviewer's call to make.
  return 'conflict';
}

/** Agency names compared ignoring case, punctuation and spacing. */
export const normAgency = (s: string | null | undefined) =>
  clean(s).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Stints in the POST career at the extracted agency. */
export function stintsAt(history: EmploymentHistory[], agency: string | null | undefined) {
  const key = normAgency(agency);
  if (!key) return [];
  return history.filter((s) => normAgency(s.post_agency_name) === key);
}

/**
 * The employing agency. Green when the POST career includes it. Never red: a career
 * that does not list it under this exact spelling may still list it under another, so
 * the difference alone proves nothing. The history table below shows every agency.
 */
export function agencyCmp(agency: string | null | undefined, history: EmploymentHistory[]): Cmp {
  if (!clean(agency)) return null;
  return stintsAt(history, agency).length > 0 ? 'match' : 'compatible';
}

/** `1999-06-06 00:00:00` / ISO timestamp / `YYYY-MM-DD` → `YYYY-MM-DD`. */
export const isoDay = (s: string | null | undefined) => clean(s).split(' ')[0].split('T')[0];

const DAY = 24 * 60 * 60 * 1000;
const toTime = (s: string) => {
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
};

/**
 * The incident date against employment at the extracted agency: was the officer
 * working there when the incident happened?
 *
 * Green when a stint at the agency covers the date. Uncoloured when it misses by a
 * year or less (POST start/end dates routinely lag the real ones by weeks). Red when
 * every stint at the agency misses by more than a year: the case says they were there,
 * and POST says they plainly were not.
 *
 * Returns the stint the comparison was made against (the covering one, or else the
 * nearest), so the POST side can show its dates.
 */
export function incidentCmp(
  incidentDate: string | null | undefined,
  stints: EmploymentHistory[],
): { state: Cmp; stint: EmploymentHistory | null } {
  const inc = toTime(isoDay(incidentDate));
  if (inc == null || stints.length === 0) return { state: null, stint: null };

  let best: { stint: EmploymentHistory; gap: number } | null = null;
  for (const stint of stints) {
    const start = toTime(isoDay(stint.post_start_date));
    if (start == null) continue;
    const end = stint.post_end_date ? toTime(isoDay(stint.post_end_date)) : Date.now();
    if (end == null) continue;
    const gap = inc < start ? start - inc : inc > end ? inc - end : 0;
    if (!best || gap < best.gap) best = { stint, gap };
  }

  if (!best) return { state: null, stint: null };
  if (best.gap === 0) return { state: 'match', stint: best.stint };
  if (best.gap <= 365 * DAY) return { state: 'compatible', stint: best.stint };
  return { state: 'conflict', stint: best.stint };
}
