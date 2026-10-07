# Validation Set + CSV-vs-UI Speed Exercise — Design (as built)

**Date:** 2026-07-15
**Status:** Implemented & deployed to production

## Goal

Stand up a controlled validation exercise for two reviewers, **Tarak** and
**Tristan**, comparing how fast they validate officer matches in a local CSV vs.
in the dashboard UI. Both reviewers work an **identical set of 50 officers**,
sampled deterministically (seed 42) from the good production cohort.

> This document records the final as-built design. The approach evolved
> materially during implementation; see **Changelog vs. original plan** at the
> end for what changed and why.

## Final decisions

- **Sample:** 50 officers, seed 42, drawn from the 289 "good" rows (see data
  cleanup below).
- **Assignment:** the same 50 officers assigned to both reviewers.
- **State model:** duplicate the rows. Each sampled officer becomes two rows
  (`<uid>__tarak`, `<uid>__tristan`), so each reviewer has independent
  validation state and they never collide.
- **`assigned_to`:** a real indexed `TEXT` column on `officer_validations`.
- **No queue / no locking.** Because each reviewer owns a distinct set of rows,
  the atomic-claim machinery is unnecessary and was removed. Reviewers navigate
  freely via a sidebar list.
- **Reviewer switcher:** a persistent Tarak/Tristan dropdown in the header.
- **CSV:** one file per reviewer, one officer per row, arrays collapsed to single
  cells of readable text (not raw JSON), with semantic `extracted_*` / `matched_*`
  column names mirroring the UI.
- **Disjoint CSV cohort:** the CSV's 50 officers (Set B) are a *different* 50 than
  the UI's (Set A), so a reviewer never validates the same officer in both tools
  (no practice/familiarity confound). See Study design below.
- **Broken links removed:** the `document_link` case-viewer link is gone from
  both the UI and the CSV. Reviewers open source docs via the (working) citation
  URLs instead.

## 1. Database

### `assigned_to` column (run once in Supabase)

```sql
ALTER TABLE officer_validations ADD COLUMN IF NOT EXISTS assigned_to TEXT;
CREATE INDEX IF NOT EXISTS idx_assigned_to ON officer_validations(assigned_to);
```

`NULL` = base pool. `'Tarak'` / `'Tristan'` = the exercise duplicates.

### Data cleanup — dropping the stale January cohort

The table held two batches:

| Batch (created) | Rows | Blob URLs | Verdict |
|---|---|---|---|
| 2026-01-17 | 72 | expire `se=2026-02` → **dead** | original upload, removed |
| 2026-07-10 | 289 | expire `se=2099-12` → **live** | good cohort, kept |

Reviewers must open the source document to confirm a match, so the 72 stale rows
(dead Azure SAS links) were backed up to
`supabase/data/output/stale_jan_rows_backup.json` and deleted
(`supabase/src/drop_stale_rows.py`).

### Incident-date enrichment

Incident dates (`csv_incident_date`, `csv_citations`, …) had only ever been
joined onto the deleted January rows. `supabase/src/enrich_incident_dates_db.py`
re-joins `data/input/deduplicated_incident_dates.csv` onto the 289 live rows by
`provisional_case_name`, writing the `csv_*` fields the UI's incident section
expects. Result: **251/289** rows enriched with a parsed incident date. This
benefits both the UI and the CSV.

## 2. Frontend (the big change: queue → free navigation)

The dashboard was built around claiming one officer at a time with a row lock
(to stop two validators grabbing the same record). With per-reviewer assignment
that collision is impossible, so the whole queue model was removed.

**Removed**

- Routes: `claim`, `release`, `queue`, `clear-locks`
- Hooks: `useClaimOfficer`, `useReleaseOfficer`, `useQueueStatus`
- Components: `QueueStatus`, `LeftSidebar`, `ReviewerNameModal`
- The one-time "what's your name?" modal and the clear-stale-locks-on-mount call
- Both broken `document_link` blocks in `OfficerDetail.tsx`

**Added**

- `GET /api/officers/list?validatorId=` → the reviewer's assigned officers
  (uid, name, POST id, status) — `useOfficerList` hook.
- `OfficerList` sidebar: all 50 officers with a status badge
  (pending / correct / incorrect / needs-review); click any to open it.
- A persistent Tarak/Tristan dropdown in `ValidationHeader` (replaces the modal).
  Switching writes `localStorage`, clears `?officer=`, and refetches the new
  reviewer's list/stats.
- Auto-advance: after a validation, the dashboard jumps to the next still-pending
  officer (wrapping), so the reviewer keeps moving.

**Changed**

- `validate` route no longer requires a lock; it validates by `mention_uid`
  (ownership is implied by assignment).
- `stats` route accepts `validatorId` and filters by `assigned_to`, so the
  progress bar reads *x / 50*, not across the whole table.
- `DashboardContent` is now header + sidebar + detail; navigation history and
  the claim/release handlers are gone.

## 3. CSV export — `supabase/src/export_validation_csv.py`

The CSV cohort (**Set B**, 50 officers) is sampled seeded (seed 43) from the base
pool, **excluding the UI's assigned officers (Set A)** — the export asserts zero
overlap. Both reviewers get the same Set B, just as they share the same UI Set A.

One file per reviewer (`tarak_validation.csv`, `tristan_validation.csv`), 50
rows, **19 columns**. Each nested array collapses into a single cell of readable,
newline-formatted text (quote → `Why:` reasoning → `ids:` line with the working
source URL), never raw JSON. Columns:

| Section | Columns |
|---|---|
| Keys | `mention_uid`, `assigned_to`, `case_id` |
| Extracted (from case) | `extracted_first_name`, `extracted_middle_name`, `extracted_last_name`, `extracted_employing_agency`, `extracted_incident_date`, `agencies_mentioned_in_case` |
| Matched POST record | `match_probability`, `matched_post_id`, `matched_post_name`, `matched_employment_history` |
| Disambiguation | `other_same_name_officers_summary`, `other_same_name_officers` |
| Evidence | `extracted_employing_agency_citations`, `extracted_incident_date_citations` |
| Reviewer fills | `decision`, `notes` |

Fill rates across the 50 (gaps are genuine data absences, not export bugs):
names / agency / POST id / POST name = 50/50; incident date + its citations =
40/50; agency citations = 45/50.

## Study design (counterbalanced UI vs CSV)

The exercise measures **how fast** each reviewer validates in the UI vs. the CSV.
Each reviewer validates **100 distinct officers**: 50 in the UI (Set A) and a
disjoint 50 in the CSV (Set B), never the same officer twice. They work in timed
**passes of 10**, alternating tools, with the **starting tool counterbalanced**
across reviewers (Tarak starts in the UI, Tristan in the CSV) to cancel out
order/warm-up effects. The reviewer-facing procedure lives in `VALIDATION_GUIDE.md`.

**Known simplification:** to avoid changing the UI, Set A is always the UI cohort
and Set B always the CSV cohort (both shared across reviewers). Tool and item-set
are therefore *paired*, not fully crossed — a pure Latin square would swap which
set each reviewer sees in each tool, which would require per-reviewer UI
assignments. Accepted trade-off for a speed comparison.

**Third reviewer (Galen).** Galen was added with an *entirely fresh* set of 100
officers — UI cohort **Set C** and CSV cohort **Set D** — mutually disjoint and
with **zero overlap** with Tarak/Tristan's Set A/Set B. All four cohorts
(A/B/C/D, 50 each) are computed deterministically and disjointly by
`supabase/src/cohorts.py`; `add_galen_ui.py` inserts Set C and the export derives
Set D. Adding Galen required adding `'Galen'` to the frontend reviewer roster and
a redeploy, but no data change for Tarak/Tristan.

## Scripts (supabase/src)

- `cohorts.py` — shared helpers computing the deterministic, disjoint cohorts (A/B/C/D).
- `create_validation_set.py` — sample 50, insert 100 tagged duplicates for Tarak/Tristan (idempotent).
- `add_galen_ui.py` — insert Galen's UI cohort (Set C), disjoint from all existing sets.
- `drop_stale_rows.py` — back up + delete the stale January cohort and any dupes.
- `enrich_incident_dates_db.py` — join incident dates onto the live cohort.
- `export_validation_csv.py` — sample the disjoint CSV cohort (Set B, seed 43) and write the two reviewer CSVs.

## Changelog vs. original plan

- **Queue kept → queue removed.** Original plan scoped the claim function by
  `assigned_to` (migration 003). We then realized locking is pointless with
  disjoint per-reviewer sets and removed the entire claim/queue/release stack in
  favor of a sidebar list. (Migration 003 and the scoped function are obsolete.)
- **CSV exploded columns (198) → readable single-cell arrays (19).** The exploded
  layout was an unusable baseline for a timed human task; collapsed to readable
  text with semantic names.
- **Sample pool 361 → 289.** Dropped the stale January rows with dead document
  links before sampling.
- **Added incident enrichment**, which the original plan assumed was already
  present (it was only on the deleted rows).

## Out of scope

- Authentication / RLS (still MVP-open).
- Persisting CSV decisions back into the DB (the CSV exercise is scored separately).
