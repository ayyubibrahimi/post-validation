"""
Upload officer validation records from JSONL to Supabase.

This script:
1. Creates the officer_validations table in Supabase (if not exists)
2. Reads the JSONL file with enriched citation data
3. Uploads each record as a single JSONB column

Usage:
    python upload_to_supabase.py
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any
from dotenv import load_dotenv
import os
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
JSON_FILE = "../data/input/matched_clean_with_conflict_citations_with_urls.json"

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


def create_table_sql() -> str:
    """Return SQL to create the officer_validations table."""
    return """
CREATE TABLE IF NOT EXISTS officer_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_uid TEXT,
  provisional_case_name TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mention_uid ON officer_validations(mention_uid);
CREATE INDEX IF NOT EXISTS idx_provisional_case ON officer_validations(provisional_case_name);
CREATE INDEX IF NOT EXISTS idx_data_gin ON officer_validations USING GIN(data);
"""


def create_table(supabase: Client):
    """Create the officer_validations table with indexes."""
    logger.info("Creating officer_validations table...")
    
    try:
        # Execute the SQL via Supabase RPC or direct SQL
        sql = create_table_sql()
        
        # Use Supabase's SQL execution (requires SQL editor or direct postgres access)
        # For now, we'll assume the table is created manually or via migration
        # You can run this SQL in Supabase SQL Editor
        
        logger.info("✓ Table creation SQL ready (run in Supabase SQL Editor if needed)")
        logger.info("\nCopy this SQL to Supabase SQL Editor:\n")
        logger.info("="*80)
        logger.info(sql)
        logger.info("="*80)
        
    except Exception as e:
        logger.error(f"Error preparing table: {e}")
        raise


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


def prepare_record_for_insert(record: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepare a record for Supabase insertion.
    
    Extracts mention_uid and provisional_case_name for indexed columns,
    stores full record in data column.
    """
    officer_info = record.get('officer_info', {})
    
    return {
        'mention_uid': officer_info.get('mention_uid'),
        'provisional_case_name': officer_info.get('provisional_case_name'),
        'data': record  # Store entire record as JSONB
    }


def upload_records(supabase: Client, records: List[Dict[str, Any]], batch_size: int = 100):
    """Upload records to Supabase in batches."""
    logger.info(f"Uploading {len(records)} records to Supabase...")
    
    prepared_records = [prepare_record_for_insert(r) for r in records]
    
    successful = 0
    failed = 0
    
    # Upload in batches
    for i in range(0, len(prepared_records), batch_size):
        batch = prepared_records[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(prepared_records) + batch_size - 1) // batch_size
        
        logger.info(f"Uploading batch {batch_num}/{total_batches} ({len(batch)} records)...")
        
        try:
            result = supabase.table('officer_validations').insert(batch).execute()
            successful += len(batch)
            logger.info(f"  ✓ Batch {batch_num} uploaded successfully")
            
        except Exception as e:
            logger.error(f"  ✗ Error uploading batch {batch_num}: {e}")
            
            # Try inserting one by one to identify problematic records
            for record in batch:
                try:
                    supabase.table('officer_validations').insert(record).execute()
                    successful += 1
                except Exception as single_error:
                    failed += 1
                    mention_uid = record.get('mention_uid', 'unknown')
                    logger.error(f"    ✗ Failed to insert record {mention_uid}: {single_error}")
    
    logger.info("\n" + "="*80)
    logger.info("UPLOAD COMPLETE")
    logger.info("="*80)
    logger.info(f"Total records: {len(records)}")
    logger.info(f"Successful: {successful}")
    logger.info(f"Failed: {failed}")
    logger.info("="*80)


def main():
    """Main execution."""
    try:
        logger.info("="*80)
        logger.info("SUPABASE UPLOAD SCRIPT")
        logger.info("="*80)
        
        # Validate environment
        validate_env()
        
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("✓ Connected to Supabase")
        
        # Show table creation SQL (user needs to run this manually)
        create_table(supabase)
        
        # Ask user to confirm table is created
        print("\n" + "="*80)
        print("IMPORTANT: Please ensure the table is created in Supabase")
        print("Copy the SQL above to Supabase SQL Editor and run it")
        print("="*80)
        input("Press ENTER when table is ready to continue...")
        
        # Load JSON data
        records = load_json(JSON_FILE)
        
        if not records:
            logger.warning("No records to upload")
            return
        
        # Upload to Supabase
        upload_records(supabase, records)
        
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