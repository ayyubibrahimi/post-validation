"""
Append mentioned agencies to officer validation records from CSV.

This script:
1. Reads the enriched JSON file with officer validations
2. Reads the CSV file with mentioned agencies
3. Matches records by provisional_case_name
4. Updates officer_info.mentioned_agencies field
5. Saves updated JSON for Supabase upsert

Usage:
    python append_mentioned_agencies.py
"""

import json
import csv
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# Configuration
JSON_INPUT = "../data/input/matched_clean_with_conflict_citations_with_urls_enriched.json"
CSV_INPUT = "../data/input/mentioned_agencies_2_5_2026.csv"
JSON_OUTPUT = "../data/output/matched_clean_with_conflict_citations_with_urls_enriched_with_agencies.json"
JSON_BACKUP = "../data/output/matched_clean_with_conflict_citations_with_urls_enriched_backup.json"

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def load_json(file_path: str) -> List[Dict[str, Any]]:
    """Load records from JSON file."""
    logger.info(f"Loading JSON from: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {file_path}")

    with open(path, 'r') as f:
        records = json.load(f)

    if not isinstance(records, list):
        raise ValueError(f"Expected JSON array, got {type(records)}")

    logger.info(f"✓ Loaded {len(records)} records from JSON")
    return records


def load_csv(file_path: str) -> Dict[str, str]:
    """
    Load CSV data and create a lookup dictionary by provisional_case_name.

    Returns:
        Dict mapping provisional_case_name -> mentioned_agencies (comma-separated string)
    """
    logger.info(f"Loading CSV from: {file_path}")

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {file_path}")

    agencies_lookup = {}

    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            case_name = row.get('provisional_case_name', '').strip()
            mentioned_agencies = row.get('mentioned_agencies', '').strip()

            if not case_name:
                logger.warning("Found CSV row without provisional_case_name, skipping")
                continue

            if case_name in agencies_lookup:
                logger.warning(f"Duplicate provisional_case_name in CSV: {case_name} (using first occurrence)")
                continue

            agencies_lookup[case_name] = mentioned_agencies if mentioned_agencies else None

    logger.info(f"✓ Loaded {len(agencies_lookup)} unique cases from CSV")
    return agencies_lookup


def update_record_with_agencies(json_record: Dict[str, Any], mentioned_agencies: Optional[str]) -> Dict[str, Any]:
    """
    Update a JSON record with mentioned agencies.

    Updates the officer_info.mentioned_agencies field.

    Args:
        json_record: The JSON record to update
        mentioned_agencies: Comma-separated string of agencies or None

    Returns:
        Updated record
    """
    updated = json_record.copy()

    # Update officer_info.mentioned_agencies
    if 'officer_info' not in updated:
        updated['officer_info'] = {}

    updated['officer_info']['mentioned_agencies'] = mentioned_agencies

    return updated


def append_agencies_to_records(
    json_records: List[Dict[str, Any]],
    agencies_lookup: Dict[str, str]
) -> tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Append mentioned agencies to all JSON records.

    Returns:
        Tuple of (updated_records, stats_dict)
    """
    logger.info("Appending mentioned agencies to JSON records...")

    updated_records = []
    stats = {
        'total': len(json_records),
        'matched': 0,
        'no_match': 0,
        'missing_case_name': 0,
        'had_agencies': 0,
        'agencies_added': 0,
        'no_agencies_found': 0
    }

    for record in json_records:
        # Get provisional_case_name from officer_info
        officer_info = record.get('officer_info', {})
        case_name = officer_info.get('provisional_case_name', '').strip()

        if not case_name:
            logger.warning(f"JSON record missing provisional_case_name: {record.get('officer_info', {}).get('mention_uid', 'unknown')}")
            stats['missing_case_name'] += 1
            updated_records.append(record)
            continue

        # Check if already has mentioned_agencies
        existing_agencies = officer_info.get('mentioned_agencies')
        if existing_agencies and existing_agencies != 'None':
            stats['had_agencies'] += 1
            logger.debug(f"Record already has agencies: {case_name}")
            updated_records.append(record)
            continue

        # Try to find matching CSV row
        mentioned_agencies = agencies_lookup.get(case_name)

        if mentioned_agencies:
            # Update the record
            updated = update_record_with_agencies(record, mentioned_agencies)
            updated_records.append(updated)
            stats['matched'] += 1
            stats['agencies_added'] += 1

            logger.debug(f"✓ Added agencies to: {case_name}")
        else:
            # No match found - keep original record (but set to None if it was 'None' string)
            if existing_agencies == 'None':
                updated = update_record_with_agencies(record, None)
                updated_records.append(updated)
            else:
                updated_records.append(record)

            stats['no_match'] += 1
            stats['no_agencies_found'] += 1
            logger.debug(f"✗ No agencies found for: {case_name}")

    return updated_records, stats


def save_json(records: List[Dict[str, Any]], file_path: str):
    """Save updated records to JSON file."""
    logger.info(f"Saving updated JSON to: {file_path}")

    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    logger.info(f"✓ Saved {len(records)} records")


def create_backup(source: str, backup: str):
    """Create a backup of the original JSON file."""
    logger.info(f"Creating backup: {backup}")

    import shutil
    shutil.copy2(source, backup)

    logger.info("✓ Backup created")


def print_stats(stats: Dict[str, int]):
    """Print update statistics."""
    logger.info("\n" + "="*80)
    logger.info("MENTIONED AGENCIES APPEND STATISTICS")
    logger.info("="*80)
    logger.info(f"Total JSON records:                {stats['total']}")
    logger.info(f"Already had agencies:              {stats['had_agencies']}")
    logger.info(f"Matched with CSV:                  {stats['matched']}")
    logger.info(f"  - Agencies added:                {stats['agencies_added']}")
    logger.info(f"No CSV match found:                {stats['no_match']}")
    logger.info(f"  - No agencies found:             {stats['no_agencies_found']}")
    logger.info(f"Missing provisional_case_name:     {stats['missing_case_name']}")
    if stats['total'] - stats['had_agencies'] > 0:
        logger.info(f"Update rate:                       {stats['agencies_added'] / (stats['total'] - stats['had_agencies']) * 100:.1f}%")
    logger.info("="*80)


def main():
    """Main execution."""
    try:
        logger.info("="*80)
        logger.info("MENTIONED AGENCIES APPEND SCRIPT")
        logger.info("="*80)

        # Load JSON records
        json_records = load_json(JSON_INPUT)

        # Load CSV data
        agencies_lookup = load_csv(CSV_INPUT)

        # Create backup
        create_backup(JSON_INPUT, JSON_BACKUP)

        # Append agencies
        updated_records, stats = append_agencies_to_records(json_records, agencies_lookup)

        # Print statistics
        print_stats(stats)

        # Confirm before saving
        print("\n" + "="*80)
        print(f"About to overwrite {JSON_OUTPUT}")
        print(f"Backup saved at: {JSON_BACKUP}")
        print("="*80)
        response = input("Continue? (yes/no): ").strip().lower()

        if response != 'yes':
            logger.info("Operation cancelled by user")
            return

        # Save updated JSON
        save_json(updated_records, JSON_OUTPUT)

        logger.info("\n✅ Mentioned agencies appended successfully!")
        logger.info(f"\nNext step: Run update_records.py to sync with Supabase:")
        logger.info(f"  python update_records.py --dry-run  # Preview changes")
        logger.info(f"  python update_records.py            # Apply changes")

    except FileNotFoundError as e:
        logger.error(f"❌ File error: {e}")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        logger.exception("Full error details:")


if __name__ == "__main__":
    main()
