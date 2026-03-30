# Feedback Iteration Plan
**Date:** 2026-03-24
**Source:** Stakeholder feedback review
**Status:** Frontend complete (F1–F9 done), Backend B1–B5 done

---

## Overview

This plan organizes all stakeholder feedback into actionable frontend and backend todos, ordered by logical dependency (data model changes first, then UI changes that rely on them).

---

## Backend TODOs

### ✅ B1 — Reviewer Name: Replace Hardcoded Validator ID
**Current state:** `validatorId` is hardcoded as `'validator_001'` in `DashboardContent.tsx` and passed through all mutations.
**Change:** Add a reviewer name input on first visit (or persistent local storage). Store the name in the database as `validated_by`. No auth system required yet — just a text field that persists across sessions (localStorage).
**Files affected:**
- `app/dashboard/DashboardContent.tsx` — replace hardcoded `validatorId`
- `hooks/useClaimOfficer.ts`, `useValidateOfficer.ts`, `useReleaseOfficer.ts` — pass real name
- `lib/types.ts` — no schema change needed (validated_by already exists)

---

### ✅ B2 — Per-Section Notes in Database Schema
**Current state:** `data.validation.notes` is one global notes string.
**Change:** Expand the validation JSONB to store per-section notes:
```json
"validation": {
  "status": "...",
  "validated_by": "...",
  "validated_at": "...",
  "notes": "...",           // legacy global notes field, repurpose as case notes
  "officer_match_notes": "...",
  "agency_citation_notes": "...",
  "incident_date_notes": "..."
}
```
**Files affected:**
- `lib/types.ts` — update `ValidationMetadata` interface
- `app/api/officers/validate/route.ts` — accept and store new notes fields
- `CLAUDE.md` — update JSONB schema docs

---

### ✅ B3 — Corrections Storage in Database Schema
**Current state:** No way to store reviewer-corrected values for incident date, employing agency, or badge number.
**Change:** Add a `corrections` object to the JSONB `data` field:
```json
"corrections": {
  "incident_date": "2022-05-14",        // reviewer-corrected date (null if accepted)
  "employing_agency": "Oakland PD",     // reviewer-corrected agency
  "badge_number": "4821",               // reviewer-corrected badge number (new field)
  "corrected_by": "Jane Smith",
  "corrected_at": "2026-03-24T10:00:00Z"
}
```
**Files affected:**
- `lib/types.ts` — add `OfficerCorrections` interface and add to `OfficerValidationData`
- `app/api/officers/validate/route.ts` — accept and store corrections
- `CLAUDE.md` — update JSONB schema docs

---

### ✅ B4 — Custom Citations Storage in Database Schema
**Current state:** Only LLM-extracted citations in `citations` (agency) and `csv_citations` (incident).
**Change:** Add `custom_citations` array to the JSONB `data` field:
```json
"custom_citations": [
  {
    "type": "agency" | "incident" | "badge",
    "quote": "...",
    "file_name": "...",
    "page_number": 1,
    "added_by": "Jane Smith",
    "added_at": "2026-03-24T...",
    "blob_url": "..."          // optional, if they can upload/link
  }
]
```
**Files affected:**
- `lib/types.ts` — add `CustomCitation` interface and add to `OfficerValidationData`
- `app/api/officers/validate/route.ts` — accept and store custom citations
- `CLAUDE.md` — update JSONB schema docs

---

### ✅ B5 — Update Validate API to Accept All New Fields
**Current state:** `/api/officers/validate` only accepts `{ mentionUid, validatorId, status, notes }`.
**Change:** Expand to accept:
```json
{
  "mentionUid": "...",
  "validatorId": "...",
  "status": "correct" | "incorrect" | "needs_review",
  "notes": "...",                  // case notes
  "officer_match_notes": "...",
  "agency_citation_notes": "...",
  "incident_date_notes": "...",
  "corrections": { ... },          // from B3
  "custom_citations": [ ... ]      // from B4
}
```
**Files affected:**
- `app/api/officers/validate/route.ts`
- `lib/types.ts` — update `ValidateOfficerRequest`
- `hooks/useValidateOfficer.ts`

---

## Frontend TODOs

### ✅ F1 — Reviewer Name Input (depends on B1)
**Current state:** Hardcoded `validator_001`.
**Change:** On first load (or when name is not set), show a modal or prompt asking "What is your name?" Store in localStorage. Display in header. Allow changing via a settings button.
**Files affected:**
- New: `components/ReviewerNameModal.tsx`
- `app/dashboard/DashboardContent.tsx` — read from localStorage, show modal if empty
- `components/ValidationHeader.tsx` — display reviewer name

---

### ✅ F2 — Label/Name Changes Throughout UI
**Change:** Rename all labels per stakeholder feedback:
| Old | New |
|-----|-----|
| "Input Officer" / "LLM Extractions" panel title | "Reviewed Officer" |
| "Agency Match To" | "Employing Agency (extracted)" |
| "Incident Date" label | "Incident Date (extracted)" |
| "Matched Post Officer" / "Entity Res: Matched POST Officer" | "Matched Officer" |
| "Confirm Match" button | "Yes" |
| "Reject Match" button | "No" |
| "Needs Review" button | "Unclear" |
| "Release Current Officer" button | "Return to Queue" |
| "Agency Citations" tab | "Employing Agency" |
| "Incident Date Citations" tab | "Incident Date" |
| "Disambiguation" section header | "{N} officers with the same name" |

**Files affected:**
- `components/OfficerDetail.tsx`
- `components/QueueStatus.tsx`

---

### ✅ F3 — Tabs restored per user feedback (Incident Date | Employing Agency)
**Current state:** Citations are split into Agency / Incident Date tabs (`activeTab` state).
**Change:** Remove the tab UI entirely. Render all sections in a single scrolling page in this order:
1. Officer comparison header (LLM extracted vs. matched officer)
2. **Incident Date section** — extracted date + incident date citations
3. **Employing Agency section** — matched agency + agency citations
4. **Badge Number section** — new section (see F5)
5. **{N} officers with the same name** — collapsible disambiguation (no "Disambiguation" label)
6. Validation actions (Yes / No / Unclear) at the bottom

**Files affected:**
- `components/OfficerDetail.tsx` — remove tab state, restructure render
- `components/OfficerDetail.module.scss` — remove tab styles, add section styles

---

### ✅ F4 — Case Notes Field
**Current state:** Notes only appear in the confirmation dialog modal.
**Change:** Add a visible "Case Notes" textarea directly on the main officer detail page (not just in dialog). This is the global notes field (maps to B2's `notes`).
**Files affected:**
- `components/OfficerDetail.tsx` — add persistent notes textarea
- `components/OfficerDetail.module.scss`

---

### ✅ F5 — Per-Section Notes Fields (depends on B2)
**Current state:** One global notes field.
**Change:** Each of the three main sections (Officer Match, Employing Agency, Incident Date) gets its own notes textarea below its content:
- "Notes for Officer Match"
- "Notes for Employing Agency"
- "Notes for Incident Date"
These are separate from the global case notes.
**Files affected:**
- `components/OfficerDetail.tsx`
- `hooks/useValidateOfficer.ts` — pass per-section notes
- `lib/types.ts` — update request type

---

### ✅ F6 — Inline Correction Fields (depends on B3)
**Current state:** No way to correct extracted values.
**Change:** Each extracted data point (incident date, employing agency, badge number) gets an "Edit" icon/button. Clicking it reveals an inline edit field pre-filled with the extracted value. Saving stores to `corrections` in the DB.
- Incident Date: date picker or text input
- Employing Agency: text input
- Badge Number: text input (new field, currently not in schema)
**Files affected:**
- `components/OfficerDetail.tsx` — add edit toggles and correction inputs
- `lib/types.ts` — add correction types

---

### ✅ F7 — Custom Citation Addition UI (depends on B4)
**Current state:** No way to add citations.
**Change:** Each citation section (Employing Agency, Incident Date, Badge Number) gets an "Add Citation" button. Clicking shows a form:
- Quote text (textarea)
- File name (text input)
- Page number (number input)
- Link URL (optional text input)
Custom citations render below LLM-extracted ones with a different visual treatment (e.g., "Added by [name]" badge).
**Files affected:**
- New: `components/AddCitationForm.tsx`
- `components/OfficerDetail.tsx` — embed form per section
- `components/CitationCard.tsx` — add visual treatment for custom citations

---

### ✅ F8 — Document Download Links
**Current state:** Citations link to blob URLs / GDrive URLs individually.
**Change:** Ensure all citation cards have clear, working download/open links. No search UI needed — reviewers download the PDF and search locally. Future enhancement: OCR full-text search across all documents.
**Files affected:**
- `components/CitationCard.tsx` — ensure link is prominent and works for both citation types

---

### ✅ F9 — POST/CPOST/Other Data Source Label
**Current state:** Always shows "POST ID" label.
**Change:** The data source type should be dynamically labeled. Add a `data_source` field or infer from existing data. For now, the UI should show a generic "ID:" or allow the label to be configurable (e.g., POST, CPOST, Other).
**Files affected:**
- `components/OfficerDetail.tsx` — make POST ID label dynamic
- `lib/types.ts` — optionally add `data_source` to `OfficerInfo`

---

## Implementation Order

### Phase 1: Frontend (current sprint)
All frontend items can be built now. Backend JSONB changes (B2–B4) are flexible (no SQL migrations needed) and will be done alongside the frontend features that require them.

1. F2 — Label/name changes (pure text, no deps)
2. F1 — Reviewer name (localStorage + new modal component)
3. F3 — Remove tabs, restructure to single scrollable page
4. F4 — Case notes field on main page
5. F5 — Per-section notes (+ B2 backend JSONB + API changes)
6. F6 — Inline corrections for incident date and employing agency (+ B3 backend, badge number deferred)
7. F7 — Custom citation UI, text-only no upload (+ B4 backend JSONB)
8. F8 — Ensure download links are clear on citation cards
9. F9 — Dynamic data source label

### Phase 2: Deferred
- B5 — Assignment/batch system (not yet scoped)
- Badge number field — data not yet available in source
- OCR document search — future enhancement

---

## Notes & Decisions

1. **Badge number**: Not in source data yet. Skip for now — will be added when data pipeline is updated.
2. **Document search**: Users download PDFs and search locally. Future: OCR full-text search across all documents.
3. **Batch/assignment system**: Deferred. Will revisit once badge number and data pipeline work is done.
4. **Custom citations**: UI only — no document upload. Reviewers can add quote text + page reference manually. Stored in JSONB `custom_citations` array.
5. **"Release Officer"**: Rename to "Return to Queue".
