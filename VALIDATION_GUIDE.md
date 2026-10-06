# Officer Match Validation Guide (Rubric)

**For:** Tarak, Tristan & Galen · **Applies to:** both the dashboard UI and the CSV
**Updated:** 2026-07-28

## The question you're answering

For each record: **is the extracted officer (from the case documents) the same
person as the matched POST record?**

## How to run your session (timed, counterbalanced)

You'll validate **50 officers in the dashboard UI and a separate 50 in the CSV**
— **100 officers total, none repeated** — timing yourself. (The UI set and CSV set
are deliberately different so you never validate the same person twice.) Work in
**passes of 10**, **alternating tools**, and **record how long each pass takes**.

Within each tool just work top-to-bottom through its own list. Your starting tool
is assigned (to cancel out order effects); alternate from there:

| Pass | Tarak | Tristan | Galen | Time |
|:--:|:--:|:--:|:--:|:--:|
| 1 | UI  | CSV | CSV | |
| 2 | CSV | UI  | UI  | |
| 3 | UI  | CSV | CSV | |
| 4 | CSV | UI  | UI  | |
| 5 | UI  | CSV | CSV | |
| 6 | CSV | UI  | UI  | |
| 7 | UI  | CSV | CSV | |
| 8 | CSV | UI  | UI  | |
| 9 | UI  | CSV | CSV | |
| 10 | CSV | UI  | UI  | |

(Find your own column and follow it top to bottom, recording your time for each pass.)

Each pass = the next 10 officers you haven't done yet **in that tool**. Five UI
passes + five CSV passes covers all 50 officers in each tool.

Rules:

- Start the timer when you open the first officer of a pass; stop when you've
  recorded a decision for the tenth. Write the elapsed time in the table.
- Do the passes **in order** — don't skip ahead or batch a tool.
- Use the **same rubric** (below) in both tools; only the tool changes, not how you
  decide.

## Decision codes

| Code | Meaning | In the UI click | In the CSV enter |
|:---:|---|---|:---:|
| **1** | Correct — same person | **Yes** | `1` |
| **0** | No match — different person | **No** | `0` |
| **2** | Unsure — can't decide | **Unclear** | `2` |

Put the number in the `decision` column of the CSV; click the matching button in
the UI.

## What to check (use every column)

Two facts should be **confirmed from citations where possible**:

1. **Employing agency** — does a citation tie the extracted person to
   `extracted_employing_agency`? (see `extracted_employing_agency_citations`)
2. **Incident date** — does a citation confirm `extracted_incident_date`?
   (see `extracted_incident_date_citations`)

Alongside those, always weigh:

- **Name** — `extracted_first/middle/last_name` vs `matched_post_name`.
- **Competing people** — `other_same_name_officers` (are there others with the
  same or a similar name who could be the real match?).
- **Employment history** — does `matched_employment_history` include the extracted
  agency?

## How to decide

Work through it in this order:

1. **Name** — is this plausibly the same person's name (exact, or an obvious
   variant — middle name/initial, suffix)?
2. **Agency** — is `extracted_employing_agency` present in the matched record's
   employment history **and** backed by an agency citation?
3. **Incident date** — is it confirmed by an incident-date citation? (context /
   data-quality check — see the note below on how it factors in)
4. **Competitors** — do any `other_same_name_officers` fit the agency/context
   *better* than the matched record?

Then apply the rubric:

| Situation | Decision |
|---|:---:|
| Name matches **and** the employing agency is confirmed by a citation, and no other same-name officer is a better fit | **1** |
| Citations point to a **different** agency or person, **or** another same-name officer is clearly the real match, **or** the name doesn't actually match | **0** |
| **No citations**, but the name matches **exactly** and there are **no** other same-/similar-name officers | **1** (judgment call) |
| **No citations** and there **are** other same-/similar-name officers (can't tell them apart) | **2** |
| Evidence is conflicting or too thin, and none of the rules above resolve it | **2** |

## Judgment-call rules (when citations are missing)

- **Unique name, no competitors → match (1)** even without citations. A perfect,
  unshared name with no rival candidates is strong enough on its own.
- **Shared or similar name + no citations → unsure (2)**, unless something else
  clearly distinguishes the right person.
- **Incident date does not decide identity.** If name + agency already confirm the
  person, an *unconfirmable* incident date still gives **1**. Only a date that
  plainly *contradicts* the case should pull you toward **2**.

## Practical tips

- Open the source document from a citation link to confirm before deciding — the
  quote is a pointer, the document is the proof.
- Lean on **2** only when you genuinely can't resolve it; it's a real signal, not a
  place to park anything mildly tricky.
