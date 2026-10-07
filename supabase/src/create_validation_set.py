"""Build the validation-set exercise cohort.

Randomly samples 50 officers from the existing rows in `officer_validations`
and inserts two tagged duplicates of each — one for Tarak, one for Tristan — so
both reviewers work an identical 50-officer set without colliding (each row has
its own single validation status).

Duplicates get:
  - a new unique mention_uid: `<orig>__tarak` / `<orig>__tristan`
  - assigned_to = "Tarak" / "Tristan"
  - validation reset to pending, locks cleared

Idempotent: aborts if any assigned_to IS NOT NULL rows already exist.

Prerequisite (run in Supabase SQL editor first):
    ALTER TABLE officer_validations ADD COLUMN IF NOT EXISTS assigned_to TEXT;
    CREATE INDEX IF NOT EXISTS idx_assigned_to ON officer_validations(assigned_to);

Usage:
    python create_validation_set.py            # sample + insert
    python create_validation_set.py --dry-run  # sample + report only, no insert
"""

import argparse
import copy
import logging
import os
import random

from dotenv import dotenv_values
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

REVIEWERS = ["Tarak", "Tristan"]
SAMPLE_SIZE = 50
SEED = 42  # fixed seed => reproducible sample


def reset_validation(data):
    """Return a deep copy of `data` with validation reset to a fresh pending state."""
    d = copy.deepcopy(data)
    d["validation"] = {
        "status": "pending",
        "validated_by": None,
        "validated_at": None,
        "notes": None,
    }
    return d


def build_duplicate(row, reviewer):
    orig_uid = row["mention_uid"]
    data = reset_validation(row["data"])
    new_uid = f"{orig_uid}__{reviewer.lower()}"
    # Keep officer_info.mention_uid in sync so the UI/exports stay consistent.
    if isinstance(data.get("officer_info"), dict):
        data["officer_info"]["mention_uid"] = new_uid
    return {
        "mention_uid": new_uid,
        "provisional_case_name": row.get("provisional_case_name"),
        "data": data,
        "assigned_to": reviewer,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Sample and report only; no insert")
    parser.add_argument("--batch-size", type=int, default=100)
    args = parser.parse_args()

    env = dotenv_values(ENV_PATH)
    sb = create_client(env["SUPABASE_URL"], env["SUPABASE_KEY"])

    # Idempotency guard: refuse to run twice.
    already = sb.table("officer_validations").select(
        "id", count="exact", head=True).not_.is_("assigned_to", "null").execute().count
    if already:
        logger.error(f"{already} rows already have assigned_to set. "
                     "Validation set appears to exist already; aborting.")
        return

    # Pull the general pool (unassigned rows) to sample from.
    rows = sb.table("officer_validations").select(
        "mention_uid, provisional_case_name, data").is_("assigned_to", "null").execute().data
    logger.info(f"Fetched {len(rows)} candidate rows")

    if len(rows) < SAMPLE_SIZE:
        logger.error(f"Only {len(rows)} rows available; need {SAMPLE_SIZE}. Aborting.")
        return

    rng = random.Random(SEED)
    sample = rng.sample(rows, SAMPLE_SIZE)
    logger.info(f"Sampled {len(sample)} officers (seed={SEED})")

    prepared = []
    for row in sample:
        for reviewer in REVIEWERS:
            prepared.append(build_duplicate(row, reviewer))

    logger.info(f"Prepared {len(prepared)} tagged duplicate rows "
                f"({SAMPLE_SIZE} officers x {len(REVIEWERS)} reviewers)")

    if args.dry_run:
        logger.info("Dry run: no rows inserted.")
        for reviewer in REVIEWERS:
            logger.info(f"  {reviewer}: {sum(1 for p in prepared if p['assigned_to'] == reviewer)} rows")
        return

    before = sb.table("officer_validations").select("id", count="exact", head=True).execute().count
    logger.info(f"Rows before: {before}")

    inserted = 0
    for i in range(0, len(prepared), args.batch_size):
        batch = prepared[i:i + args.batch_size]
        sb.table("officer_validations").insert(batch).execute()
        inserted += len(batch)
        logger.info(f"Inserted {inserted}/{len(prepared)}")

    after = sb.table("officer_validations").select("id", count="exact", head=True).execute().count
    logger.info(f"Rows after: {after}  (before {before} + inserted {inserted})")


if __name__ == "__main__":
    main()
