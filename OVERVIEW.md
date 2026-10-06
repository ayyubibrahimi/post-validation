# Officer Validation — Front-End Overview

**Updated:** 2026-07-15

This is a plain-language overview of how validating an officer match works in the
dashboard today. For the decision rubric reviewers follow see
`VALIDATION_GUIDE.md`; for deep technical/architecture notes see `CLAUDE.md`; for
the current validation-set exercise see
`docs/plans/2026-07-15-validation-set-design.md`.

## What the tool does

Each record pairs an **officer extracted from a case document** with a **candidate
match in the POST (Peace Officer Standards and Training) database**. A reviewer's
job is to decide whether the match is right by comparing the two sides and reading
the supporting citations.

## Who reviews

The app is currently scoped to three reviewers, **Tarak**, **Tristan**, and
**Galen**. A persistent dropdown in the top header selects who you are; your
identity is remembered across sessions. Each reviewer is assigned their own fixed
set of 50 officers and only ever sees those.

There is **no queue and no locking.** Because each reviewer owns a distinct set of
rows, they can move through their 50 freely — no "claim the next one" step.

## The reviewing workflow

1. **Pick an officer** from the left sidebar. The sidebar lists all 50 assigned
   officers with a status badge (pending, correct, incorrect, needs-review) so
   progress is visible at a glance.
2. **Compare the two panels** in the main view:
   - **Reviewed Officer (extracted):** the name, employing agency, and incident
     date pulled from the case documents, plus all agencies mentioned and the
     case ID.
   - **Matched Officer (POST):** the matched POST ID, match probability, and the
     candidate's full employment history.
3. **Check the disambiguation:** other officers in POST with the same name, so you
   can tell whether the match picked the right person.
4. **Read the citations** — the evidence, each with a quote, the reasoning for why
   it supports the match, and a link to open the source document:
   - **Employing-agency citations** support the extracted employing agency.
   - **Incident-date citations** support the extracted incident date.
5. **Make corrections if needed** — the employing agency and incident date are
   editable inline, and you can add your own citation if the provided ones are
   insufficient.
6. **Decide:** **Yes** (correct), **No** (incorrect), or **Unclear** (needs
   review), with optional notes at the officer level and per-section.
7. The view **auto-advances** to your next pending officer so you keep moving.

## What "confirming a match" requires

Reviewers confirm or reject by opening the raw source document from a citation and
checking that it genuinely ties the officer to the agency (and, for dates, to the
incident). Every officer in the current set was chosen to have working document
links, so this is always possible.

## Progress & decisions

- The header progress bar shows *validated / total* for **your** 50 officers.
- Decisions are saved immediately to the record; there is no separate submit step.
- Switching reviewers reloads that person's list and progress.

## Relationship to the CSV exercise

A **separate** 50 officers (different from the 50 in the UI, so no officer is ever
validated twice) are exported to a spreadsheet
(`supabase/data/output/<reviewer>_validation.csv`) with the same information laid
out one officer per row. The exercise compares how fast validation goes in the CSV
vs. here in the UI. The CSV's column names deliberately mirror this screen —
`extracted_*` for the case side, `matched_*` for the POST side, and citation
columns named for the field they support.
