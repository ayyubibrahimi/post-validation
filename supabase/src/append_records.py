"""Append officer-validation records to Supabase (non-destructive insert).

Unlike upload.py (which assumes a fresh table), this inserts new records
alongside existing rows. Used to add the with-conflicts cohort produced by the
employing-agency pipeline. Reports row counts before/after as a safety check.

Usage:
    python append_records.py --input /abs/path/matched_clean_with_conflict_citations_with_urls.json
"""

import argparse
import json
import logging
import os

from dotenv import dotenv_values
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def prepare(record):
    info = record.get("officer_info", {})
    return {
        "mention_uid": info.get("mention_uid"),
        "provisional_case_name": info.get("provisional_case_name"),
        "data": record,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--batch-size", type=int, default=100)
    args = parser.parse_args()

    env = dotenv_values(ENV_PATH)
    sb = create_client(env["SUPABASE_URL"], env["SUPABASE_KEY"])

    before = sb.table("officer_validations").select("id", count="exact").limit(1).execute().count
    logger.info(f"Rows before: {before}")

    with open(args.input) as f:
        records = json.load(f)
    prepared = [prepare(r) for r in records]

    # Guard against duplicate mention_uids already present.
    existing = {x["mention_uid"] for x in
                sb.table("officer_validations").select("mention_uid").execute().data}
    dupes = [p for p in prepared if p["mention_uid"] in existing]
    if dupes:
        logger.warning(f"{len(dupes)} incoming mention_uids already exist; skipping those")
        prepared = [p for p in prepared if p["mention_uid"] not in existing]

    inserted = 0
    for i in range(0, len(prepared), args.batch_size):
        batch = prepared[i:i + args.batch_size]
        sb.table("officer_validations").insert(batch).execute()
        inserted += len(batch)
        logger.info(f"Inserted {inserted}/{len(prepared)}")

    after = sb.table("officer_validations").select("id", count="exact").limit(1).execute().count
    logger.info(f"Rows after: {after}  (before {before} + inserted {inserted})")


if __name__ == "__main__":
    main()
