"""
Update existing officer validation records in Supabase with enriched data.

This script:
1. Reads the enriched JSON file with updated officer data
2. For each record, updates the corresponding row in Supabase by mention_uid
3. Preserves validation data (status, validated_by, validated_at, notes)
4. Updates all other officer data with the new enriched information

Usage:
    python update_records.py
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import os
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
JSON_FILE = "../data/output/matched_clean_with_conflict_citations_with_urls_enriched_with_agencies.json"

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def validate_env():
    """Validate required environment variables are set."""
    if not SUPABASE_URL:
        raise ValueError("SUPABASE_URL not found in environment variables")
    if not SUPABASE_KEY:
        raise ValueError("SUPABASE_KEY not found in environment variables")
    logger.info("✓ Environment variables validated")


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


def get_existing_record(supabase: Client, mention_uid: str) -> Optional[Dict[str, Any]]:
    """
    Fetch existing record from Supabase by mention_uid.

    Returns:
        Existing record dict or None if not found
    """
    try:
        result = supabase.table('officer_validations') \
            .select('*') \
            .eq('mention_uid', mention_uid) \
            .execute()

        if result.data and len(result.data) > 0:
            return result.data[0]
        return None

    except Exception as e:
        logger.error(f"Error fetching record {mention_uid}: {e}")
        return None


def merge_validation_data(new_data: Dict[str, Any], existing_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge new officer data with existing validation data.

    Preserves:
    - validation.status (if not 'pending')
    - validation.validated_by
    - validation.validated_at
    - validation.notes
    - being_reviewed_by
    - being_reviewed_at

    Args:
        new_data: New officer data from JSON
        existing_data: Existing record from Supabase (full row including 'data' field)

    Returns:
        Merged data dictionary
    """
    merged = new_data.copy()

    # If there's existing data, preserve validation info
    if existing_data and existing_data.get('data'):
        existing_validation = existing_data['data'].get('validation', {})

        # Only preserve validation if it's been changed from 'pending'
        if existing_validation.get('status') != 'pending':
            logger.debug(f"Preserving validation status: {existing_validation.get('status')}")
            merged['validation'] = existing_validation
        else:
            # Keep the new validation structure (should be 'pending')
            logger.debug("Keeping new validation structure (status=pending)")

    return merged


def prepare_update_record(
    new_record: Dict[str, Any],
    existing_record: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Prepare a record for Supabase update.

    Args:
        new_record: New officer data from JSON
        existing_record: Existing row from Supabase (includes id, data, being_reviewed_by, etc.)

    Returns:
        Dictionary with fields to update
    """
    officer_info = new_record.get('officer_info', {})

    # Merge validation data
    merged_data = merge_validation_data(new_record, existing_record)

    update_dict = {
        'mention_uid': officer_info.get('mention_uid'),
        'provisional_case_name': officer_info.get('provisional_case_name'),
        'data': merged_data  # Store entire merged record as JSONB
    }

    # Preserve lock fields if the record is currently being reviewed
    if existing_record:
        being_reviewed_by = existing_record.get('being_reviewed_by')
        being_reviewed_at = existing_record.get('being_reviewed_at')

        if being_reviewed_by:
            logger.debug(f"Preserving lock: being_reviewed_by={being_reviewed_by}")
            # Don't update being_reviewed_by or being_reviewed_at in the update dict
            # They will be preserved automatically by not including them

    return update_dict


def update_records(supabase: Client, records: List[Dict[str, Any]], dry_run: bool = False):
    """Update records in Supabase one by one."""
    mode = "DRY RUN" if dry_run else "UPDATE"
    logger.info(f"{mode}: Processing {len(records)} records in Supabase...")

    stats = {
        'total': len(records),
        'updated': 0,
        'not_found': 0,
        'failed': 0,
        'validation_preserved': 0
    }

    for i, record in enumerate(records, 1):
        officer_info = record.get('officer_info', {})
        mention_uid = officer_info.get('mention_uid')

        if not mention_uid:
            logger.warning(f"Record {i} missing mention_uid, skipping")
            stats['failed'] += 1
            continue

        # Log progress every 10 records
        if i % 10 == 0:
            logger.info(f"Progress: {i}/{len(records)} ({i/len(records)*100:.1f}%)")

        try:
            # Fetch existing record
            existing_record = get_existing_record(supabase, mention_uid)

            if not existing_record:
                logger.warning(f"Record {mention_uid} not found in Supabase, skipping")
                stats['not_found'] += 1
                continue

            # Check if validation was preserved
            existing_validation_status = existing_record.get('data', {}).get('validation', {}).get('status')
            if existing_validation_status and existing_validation_status != 'pending':
                stats['validation_preserved'] += 1

            # Prepare update
            update_data = prepare_update_record(record, existing_record)

            if dry_run:
                # Dry run: just log what would be updated
                logger.debug(f"Would update: {mention_uid}")
                stats['updated'] += 1
            else:
                # Actually update the record
                result = supabase.table('officer_validations') \
                    .update(update_data) \
                    .eq('mention_uid', mention_uid) \
                    .execute()

                stats['updated'] += 1
                logger.debug(f"✓ Updated: {mention_uid}")

        except Exception as e:
            stats['failed'] += 1
            logger.error(f"✗ Failed to update {mention_uid}: {e}")

    # Print final statistics
    logger.info("\n" + "="*80)
    if dry_run:
        logger.info("DRY RUN COMPLETE (No changes made)")
    else:
        logger.info("UPDATE COMPLETE")
    logger.info("="*80)
    logger.info(f"Total records:           {stats['total']}")
    logger.info(f"Successfully updated:    {stats['updated']}")
    logger.info(f"Not found in Supabase:   {stats['not_found']}")
    logger.info(f"Failed:                  {stats['failed']}")
    logger.info(f"Validations preserved:   {stats['validation_preserved']}")
    logger.info("="*80)


def main():
    """Main execution."""
    import sys

    try:
        logger.info("="*80)
        logger.info("SUPABASE UPDATE SCRIPT")
        logger.info("="*80)

        # Check for dry-run flag
        dry_run = '--dry-run' in sys.argv or '-d' in sys.argv

        if dry_run:
            logger.info("🔍 DRY RUN MODE: No changes will be made")
            logger.info("="*80)

        # Validate environment
        validate_env()

        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✓ Connected to Supabase")

        # Load JSON data
        records = load_json(JSON_FILE)

        if not records:
            logger.warning("No records to update")
            return

        # Confirm with user (skip if dry run)
        if not dry_run:
            print("\n" + "="*80)
            print(f"About to update {len(records)} records in Supabase")
            print("This will:")
            print("  - Update officer data with enriched information")
            print("  - Preserve any existing validation data")
            print("  - Preserve lock fields (being_reviewed_by, being_reviewed_at)")
            print("="*80)
            response = input("Continue? (yes/no): ").strip().lower()

            if response != 'yes':
                logger.info("Update cancelled by user")
                return

        # Update records
        update_records(supabase, records, dry_run=dry_run)

        if dry_run:
            logger.info("\n✅ Dry run completed! Run without --dry-run to apply changes.")
        else:
            logger.info("\n✅ Script completed successfully!")

    except ValueError as e:
        logger.error(f"❌ Configuration error: {e}")
    except FileNotFoundError as e:
        logger.error(f"❌ File error: {e}")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        logger.exception("Full error details:")


if __name__ == "__main__":
    main()
