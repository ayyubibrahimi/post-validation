"""Export the CSV-cohort of 50 officers to a review-friendly CSV per reviewer.

The CSV cohort (Set B) is a DIFFERENT 50 officers than the UI cohort (Set A), so
in the counterbalanced speed study no reviewer ever validates the same officer in
both tools. Set B is sampled (seeded) from the base pool, excluding Set A.

One row per officer, with semantic column names mirroring the dashboard UI:
the EXTRACTED officer (pulled from the case documents) laid out beside the
MATCHED POST record, so a reviewer can compare them and mark a decision.

Nested arrays (employment history, other same-name officers, agency citations,
incident-date citations) each collapse into a SINGLE cell of readable, newline-
formatted text — not raw JSON — so quotes and reasoning scan quickly in a sheet.
Citation cells keep the source-document URL so reviewers can open the raw PDF.

Blank `decision` and `notes` columns are appended for the reviewer to fill.

Usage:
    python export_validation_csv.py                  # -> ../data/output/<reviewer>_validation.csv
    python export_validation_csv.py --out-dir /abs/path
"""

import argparse
import csv
import logging
import os

from dotenv import dotenv_values
from supabase import create_client

import cohorts

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
DEFAULT_OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "output")


def val(v):
    return "" if v is None else str(v)


def dt(v):
    """Trim the midnight time component from date strings for readability."""
    return val(v).replace(" 00:00:00", "")


def full_name(d, prefix=""):
    keys = [f"{prefix}first_name", f"{prefix}middle_name", f"{prefix}last_name"]
    return " ".join(x for x in (d.get(k) for k in keys) if x).strip()


def matched_post_name(employment):
    """Canonical name of the matched POST officer (from their first employment row)."""
    if not employment:
        return ""
    e = employment[0]
    parts = [e.get("post_first_name"), e.get("post_middle_name"),
             e.get("post_last_name"), e.get("post_suffix")]
    return " ".join(x for x in parts if x).strip()


def fmt_employment(items):
    blocks = []
    for i, e in enumerate(items or [], 1):
        head = f"[{i}] {full_name(e, 'post_')}".rstrip()
        if e.get("post_person_nbr"):
            head += f" · {e['post_person_nbr']}"
        agency = val(e.get("post_agency_name"))
        if e.get("post_agency_type"):
            agency += f" ({e['post_agency_type']})"
        loc = " / ".join(x for x in [e.get("state"), e.get("county")] if x)
        line3 = f"{dt(e.get('post_start_date')) or '?'} → {dt(e.get('post_end_date')) or 'present'}"
        if loc:
            line3 += f" · {loc}"
        extras = []
        if e.get("post_suffix"):
            extras.append(f"suffix: {e['post_suffix']}")
        if e.get("post_separation_reason"):
            extras.append(f"separation: {e['post_separation_reason']}")
        lines = [head, agency, line3] + (["   " + " · ".join(extras)] if extras else [])
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


def fmt_others(items):
    blocks = []
    for i, e in enumerate(items or [], 1):
        head = f"[{i}] {full_name(e, 'post_')}".rstrip()
        if e.get("post_person_nbr"):
            head += f" · {e['post_person_nbr']}"
        line2 = val(e.get("post_agency_name"))
        line2 += f" · {dt(e.get('post_start_date')) or '?'} → {dt(e.get('post_end_date')) or 'present'}"
        blocks.append(head + "\n" + line2)
    return "\n\n".join(blocks)


def fmt_citations(items, id_keys):
    blocks = []
    for i, c in enumerate(items or [], 1):
        fn = c.get("file_name") or c.get("filename") or ""
        head = f"[{i}] {fn}"
        if c.get("page_number") not in (None, ""):
            head += f" · p.{c['page_number']}"
        if c.get("agency_name"):
            head += f" · {c['agency_name']}"
        lines = [head]
        if c.get("quote"):
            lines.append(f"\"{c['quote']}\"")
        if c.get("validator_reasoning"):
            lines.append(f"Why: {c['validator_reasoning']}")
        ids = [f"{k}={c[k]}" for k in id_keys if c.get(k)]
        if ids:
            lines.append("ids: " + "  ".join(ids))
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks)


# Ordered CSV schema. Each entry: (column_name, value function of the officer's data dict).
def build_columns():
    def info(d):
        return d.get("officer_info") or {}

    return [
        ("mention_uid", lambda d: info(d).get("mention_uid")),
        ("assigned_to", lambda d: d.get("assigned_to")),
        ("case_id", lambda d: info(d).get("provisional_case_name")),

        # Extracted from the case documents
        ("extracted_first_name", lambda d: info(d).get("first_name")),
        ("extracted_middle_name", lambda d: info(d).get("middle_name")),
        ("extracted_last_name", lambda d: info(d).get("last_name")),
        ("extracted_employing_agency", lambda d: info(d).get("matched_agency")),
        ("extracted_incident_date", lambda d: d.get("csv_incident_date")),
        ("agencies_mentioned_in_case", lambda d: info(d).get("mentioned_agencies")),

        # Matched POST record
        ("match_probability", lambda d: info(d).get("match_probability")),
        ("matched_post_id", lambda d: info(d).get("matched_post_id")),
        ("matched_post_name", lambda d: matched_post_name(d.get("matched_officer_employment_history"))),
        ("matched_employment_history", lambda d: fmt_employment(d.get("matched_officer_employment_history"))),

        # Disambiguation
        ("other_same_name_officers_summary", lambda d: info(d).get("other_officers_summary")),
        ("other_same_name_officers", lambda d: fmt_others(d.get("other_officers_with_same_name"))),

        # Evidence — each citation set supports the extracted field it is named for
        ("extracted_employing_agency_citations", lambda d: fmt_citations(d.get("citations"), ["sha1", "blob_url"])),
        ("extracted_incident_date_citations", lambda d: fmt_citations(d.get("csv_citations"), ["sha1", "gdrive_url"])),

        # Reviewer fills these in
        ("decision", lambda d: ""),
        ("notes", lambda d: ""),
    ]


def write_reviewer_csv(records, reviewer, out_dir):
    columns = build_columns()
    fieldnames = [name for name, _ in columns]

    out_records = []
    for r in records:
        d = dict(r["data"])
        d["assigned_to"] = reviewer  # label the file's owner (DB row is untagged)
        out_records.append({name: val(fn(d)) for name, fn in columns})

    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{reviewer.lower()}_validation.csv")
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(out_records)
    logger.info(f"{reviewer}: wrote {len(out_records)} rows, {len(fieldnames)} columns -> {out_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=DEFAULT_OUT_DIR)
    args = parser.parse_args()

    env = dotenv_values(ENV_PATH)
    sb = create_client(env["SUPABASE_URL"], env["SUPABASE_KEY"])

    pool, ui = cohorts.load(sb)

    # Tarak & Tristan share CSV cohort Set B. Galen (if present) gets Set D.
    set_b = cohorts.tt_csv(pool, ui)
    outputs = [("Tarak", set_b), ("Tristan", set_b)]
    if "Galen" in ui:
        outputs.append(("Galen", cohorts.galen_csv(pool, ui)))

    # Safety: every CSV cohort must be disjoint from every reviewer's UI cohort.
    ui_all = set().union(*ui.values()) if ui else set()
    for reviewer, records in outputs:
        overlap = cohorts.uids(records) & ui_all
        assert not overlap, f"{reviewer} CSV cohort overlaps a UI cohort: {overlap}"
        write_reviewer_csv(records, reviewer, args.out_dir)


if __name__ == "__main__":
    main()
