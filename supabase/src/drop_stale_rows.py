"""One-off cleanup: drop the stale January cohort and reset the validation set.

Context: the original 2026-01-17 upload (72 rows) carries Azure blob SAS URLs
that expired (se=2026-02) and can no longer open their source documents. The
2026-07-10 appended cohort (289 rows) has long-lived URLs (se=2099). Reviewers
must be able to open the raw document, so the stale batch is removed and the
validation set is rebuilt from the good pool only.

Steps:
  1. Back up the stale rows (created_at < CUTOFF) to JSON.
  2. Delete the validation-set duplicates (assigned_to IS NOT NULL).
  3. Delete the stale rows.
  4. Report counts.

After this, re-run create_validation_set.py + export_validation_csv.py.

Usage:
    python drop_stale_rows.py
"""

import json
import logging
import os

from dotenv import dotenv_values
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
BACKUP_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data",
                           "output", "stale_jan_rows_backup.json")

# Boundary between the stale January batch and the good July batch.
CUTOFF = "2026-07-01"


def main():
    env = dotenv_values(ENV_PATH)
    sb = create_client(env["SUPABASE_URL"], env["SUPABASE_KEY"])

    total_before = sb.table("officer_validations").select("id", count="exact", head=True).execute().count
    logger.info(f"Rows before: {total_before}")

    # 1. Back up stale rows.
    stale = sb.table("officer_validations").select("*").lt("created_at", CUTOFF).execute().data
    logger.info(f"Stale rows (created_at < {CUTOFF}): {len(stale)}")
    os.makedirs(os.path.dirname(BACKUP_PATH), exist_ok=True)
    with open(BACKUP_PATH, "w") as f:
        json.dump(stale, f, indent=2, default=str)
    logger.info(f"Backed up {len(stale)} stale rows -> {BACKUP_PATH}")

    # 2. Delete validation-set duplicates.
    dupes = sb.table("officer_validations").select("id", count="exact", head=True).not_.is_("assigned_to", "null").execute().count
    sb.table("officer_validations").delete().not_.is_("assigned_to", "null").execute()
    logger.info(f"Deleted {dupes} validation-set duplicate rows")

    # 3. Delete stale rows.
    sb.table("officer_validations").delete().lt("created_at", CUTOFF).execute()
    logger.info(f"Deleted {len(stale)} stale rows")

    total_after = sb.table("officer_validations").select("id", count="exact", head=True).execute().count
    logger.info(f"Rows after: {total_after}  (expected {total_before - len(stale) - dupes})")


if __name__ == "__main__":
    main()
