"""Deterministic, disjoint officer cohorts for the validation study.

Every reviewer has a UI cohort and a CSV cohort, and no officer appears in more
than one cohort. Cohorts are computed by seeded sampling from the base pool
(assigned_to IS NULL), sorted by mention_uid so the sampling is reproducible
regardless of DB row order. Both the insert script and the export script import
these helpers so they compute identical sets.

Allocation order (each excludes all earlier cohorts, so there is no circular
dependency and Tarak/Tristan's sets never shift when a new reviewer is added):

    A  Tarak/Tristan UI   (in the DB, tagged assigned_to)     seed 42
    B  Tarak/Tristan CSV  = sample from pool \\ A             seed 43
    C  Galen UI           = sample from pool \\ (A ∪ B)       seed 44  (tagged on insert)
    D  Galen CSV          = sample from pool \\ (A ∪ B ∪ C)   seed 45

`uids(rows)` -> set of mention_uids; `load(sb)` -> (sorted pool, ui-sets-by-reviewer).
"""

import random

SEED_TT_CSV = 43   # Set B
SEED_GALEN_UI = 44  # Set C
SEED_GALEN_CSV = 45  # Set D
COHORT_SIZE = 50


def base_uid(mention_uid):
    return mention_uid.replace("__tarak", "").replace("__tristan", "").replace("__galen", "")


def uids(rows):
    return {r["mention_uid"] for r in rows}


def load(sb):
    """Return (base pool sorted by mention_uid, {reviewer: set of UI base uids})."""
    pool = sb.table("officer_validations").select(
        "mention_uid, provisional_case_name, data").is_("assigned_to", "null").execute().data
    pool.sort(key=lambda r: r["mention_uid"])

    assigned = sb.table("officer_validations").select("mention_uid, assigned_to").not_.is_(
        "assigned_to", "null").execute().data
    ui = {}
    for a in assigned:
        ui.setdefault(a["assigned_to"], set()).add(base_uid(a["mention_uid"]))
    return pool, ui


def sample_excluding(pool, exclude, seed, size=COHORT_SIZE):
    candidates = [r for r in pool if r["mention_uid"] not in exclude]
    if len(candidates) < size:
        raise ValueError(f"Only {len(candidates)} candidates available; need {size}")
    return random.Random(seed).sample(candidates, size)


def tt_ui(ui):
    """Set A — the UI cohort shared by Tarak and Tristan."""
    return ui.get("Tarak", set()) | ui.get("Tristan", set())


def tt_csv(pool, ui):
    """Set B — the CSV cohort for Tarak/Tristan (excludes A)."""
    return sample_excluding(pool, tt_ui(ui), SEED_TT_CSV)


def galen_ui(pool, ui):
    """Set C — Galen's UI cohort (excludes A ∪ B). Used to seed the DB insert."""
    a = tt_ui(ui)
    b = uids(tt_csv(pool, ui))
    return sample_excluding(pool, a | b, SEED_GALEN_UI)


def galen_csv(pool, ui):
    """Set D — Galen's CSV cohort (excludes A ∪ B ∪ C). C is read from the DB once tagged."""
    a = tt_ui(ui)
    b = uids(tt_csv(pool, ui))
    c = ui.get("Galen", set())
    return sample_excluding(pool, a | b | c, SEED_GALEN_CSV)
