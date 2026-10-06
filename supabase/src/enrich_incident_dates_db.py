"""Enrich the live cohort with incident-date data (in-place, in Supabase).

The July cohort was never incident-enriched (that join only ran on the deleted
January rows). This joins `deduplicated_incident_dates.csv` onto the current
base rows (assigned_to IS NULL) by provisional_case_name and writes the csv_*
fields the front-end's incident section expects:
  csv_incident_date, csv_incident_year/month/day, csv_citations,
  csv_blob_urls, csv_enriched_at

Idempotent-ish: re-running simply overwrites the csv_* fields with the same
values. Run BEFORE (re)building the validation set so the duplicates inherit it.

Usage:
    python enrich_incident_dates_db.py
"""

import csv
import json
import logging
import os
from datetime import datetime

from dotenv import dotenv_values
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
CSV_INPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "input",
                         "deduplicated_incident_dates.csv")


def parse_incident_date(row):
    try:
        y, m, d = row.get("incident_year", "").strip(), row.get("incident_month", "").strip(), row.get("incident_day", "").strip()
        if not (y and m and d):
            return None
        yi, mi, di = int(float(y)), int(float(m)), int(float(d))
        if not (1900 <= yi <= 2100 and 1 <= mi <= 12 and 1 <= di <= 31):
            return None
        return datetime(yi, mi, di).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def parse_citations(s):
    if not s or not s.strip():
        return None
    try:
        c = json.loads(s)
        return c if isinstance(c, list) else None
    except json.JSONDecodeError:
        return None


def main():
    env = dotenv_values(ENV_PATH)
    sb = create_client(env["SUPABASE_URL"], env["SUPABASE_KEY"])

    # Build case-name -> incident row lookup (first occurrence wins).
    lookup = {}
    with open(CSV_INPUT, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            cn = (r.get("provisional_case_name") or "").strip()
            if cn and cn not in lookup:
                lookup[cn] = r
    logger.info(f"Loaded {len(lookup)} unique cases from incident CSV")

    rows = sb.table("officer_validations").select("mention_uid, data").is_("assigned_to", "null").execute().data
    logger.info(f"Base rows to enrich: {len(rows)}")

    now = datetime.utcnow().isoformat() + "Z"
    matched = with_date = 0
    for row in rows:
        data = row["data"]
        case = ((data.get("officer_info") or {}).get("provisional_case_name") or "").strip()
        csv_row = lookup.get(case)
        if not csv_row:
            continue
        matched += 1
        incident_date = parse_incident_date(csv_row)
        if incident_date:
            with_date += 1
        data.update({
            "csv_incident_date": incident_date,
            "csv_incident_year": (csv_row.get("incident_year") or "").strip() or None,
            "csv_incident_month": (csv_row.get("incident_month") or "").strip() or None,
            "csv_incident_day": (csv_row.get("incident_day") or "").strip() or None,
            "csv_citations": parse_citations(csv_row.get("citations", "")),
            "csv_blob_urls": (csv_row.get("blob_urls") or "").strip() or None,
            "csv_enriched_at": now,
        })
        sb.table("officer_validations").update({"data": data}).eq("mention_uid", row["mention_uid"]).execute()

    logger.info(f"Enriched {matched}/{len(rows)} rows matched to incident CSV; {with_date} got a parsed date")


if __name__ == "__main__":
    main()
