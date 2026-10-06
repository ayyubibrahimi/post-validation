"""Insert Galen's UI cohort (Set C) — 50 officers disjoint from all existing sets.

Galen is a third reviewer. His UI cohort is a fresh 50 officers with no overlap
with Tarak/Tristan's UI (Set A) or CSV (Set B) cohorts. Rows are inserted tagged
`assigned_to = 'Galen'` (mention_uid `<orig>__galen`) so the dashboard serves them.

Idempotent: aborts if Galen already has assigned rows.

Run BEFORE re-exporting CSVs (the export reads Galen's UI cohort from the DB to
keep his CSV cohort disjoint from it).

Usage:
    python add_galen_ui.py
"""

import copy
import logging
import os

from dotenv import dotenv_values
from supabase import create_client

import cohorts

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] %(message)s",
                    datefmt="%Y-%m-%d %H:%M:%S")
logger = logging.getLogger(__name__)

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
REVIEWER = "Galen"


def build_duplicate(row):
    data = copy.deepcopy(row["data"])
    data["validation"] = {"status": "pending", "validated_by": None, "validated_at": None, "notes": None}
    new_uid = f"{row['mention_uid']}__{REVIEWER.lower()}"
    if isinstance(data.get("officer_info"), dict):
        data["officer_info"]["mention_uid"] = new_uid
    return {
        "mention_uid": new_uid,
        "provisional_case_name": row.get("provisional_case_name"),
        "data": data,
        "assigned_to": REVIEWER,
    }


def main():
    env = dotenv_values(ENV_PATH)
    sb = create_client(env["SUPABASE_URL"], env["SUPABASE_KEY"])

    pool, ui = cohorts.load(sb)
    if REVIEWER in ui:
        logger.error(f"{REVIEWER} already has {len(ui[REVIEWER])} assigned rows; aborting.")
        return

    set_c = cohorts.galen_ui(pool, ui)
    # Safety: no overlap with A or B.
    a = cohorts.tt_ui(ui)
    b = cohorts.uids(cohorts.tt_csv(pool, ui))
    overlap = cohorts.uids(set_c) & (a | b)
    assert not overlap, f"Galen UI overlaps existing cohorts: {overlap}"
    logger.info(f"Galen UI (Set C): {len(set_c)} officers, disjoint from {len(a)} UI + {len(b)} CSV officers")

    rows = [build_duplicate(r) for r in set_c]
    before = sb.table("officer_validations").select("id", count="exact", head=True).execute().count
    sb.table("officer_validations").insert(rows).execute()
    after = sb.table("officer_validations").select("id", count="exact", head=True).execute().count
    logger.info(f"Inserted {len(rows)} Galen UI rows. Total {before} -> {after}")


if __name__ == "__main__":
    main()
