"""
Enrich JSON officer validation records with citation data from CSV.

This script:
1. Reads the existing JSON file with officer validations
2. Reads the CSV file with citation data
3. Matches records by provisional_case_name
4. Appends new fields to JSON records (non-destructively)
5. Saves enriched JSON for Supabase upsert

Usage:
    python enrich_json_with_csv.py
"""

import json
import csv
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

# Configuration
JSON_INPUT = "../data/input/matched_clean_with_conflict_citations_with_urls.json"
CSV_INPUT = "../data/input/deduplicated_incident_dates.csv"  # Update with your CSV path
JSON_OUTPUT = "../data/input/matched_clean_with_conflict_citations_with_urls_enriched.json"
JSON_BACKUP = "../data/input/matched_clean_with_conflict_citations_with_urls_backup.json"

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


def load_csv(file_path: str) -> Dict[str, Dict[str, Any]]:
    """
    Load CSV data and create a lookup dictionary by provisional_case_name.
    
    Returns:
        Dict mapping provisional_case_name -> CSV row data
    """
    logger.info(f"Loading CSV from: {file_path}")
    
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {file_path}")
    
    csv_lookup = {}
    
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            case_name = row.get('provisional_case_name', '').strip()
            
            if not case_name:
                logger.warning("Found CSV row without provisional_case_name, skipping")
                continue
            
            if case_name in csv_lookup:
                logger.warning(f"Duplicate provisional_case_name in CSV: {case_name} (using first occurrence)")
                continue
            
            csv_lookup[case_name] = row
    
    logger.info(f"✓ Loaded {len(csv_lookup)} unique cases from CSV")
    return csv_lookup


def parse_incident_date(csv_row: Dict[str, Any]) -> Optional[str]:
    """
    Parse incident date from separate year/month/day columns.
    
    Combines incident_year, incident_month, incident_day into ISO format (YYYY-MM-DD).
    
    Returns:
        ISO date string (YYYY-MM-DD) or None if parsing fails
    """
    try:
        year = csv_row.get('incident_year', '').strip()
        month = csv_row.get('incident_month', '').strip()
        day = csv_row.get('incident_day', '').strip()
        
        # Check if all components exist
        if not year or not month or not day:
            return None
        
        # Convert to integers (handles both string numbers and actual numbers)
        year_int = int(float(year))
        month_int = int(float(month))
        day_int = int(float(day))
        
        # Validate ranges
        if not (1900 <= year_int <= 2100):
            logger.warning(f"Invalid year: {year_int}")
            return None
        if not (1 <= month_int <= 12):
            logger.warning(f"Invalid month: {month_int}")
            return None
        if not (1 <= day_int <= 31):
            logger.warning(f"Invalid day: {day_int}")
            return None
        
        # Create date object and return ISO format
        date_obj = datetime(year_int, month_int, day_int)
        return date_obj.strftime('%Y-%m-%d')
        
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to parse incident date from year={csv_row.get('incident_year')}, month={csv_row.get('incident_month')}, day={csv_row.get('incident_day')}: {e}")
        return None


def parse_citations_json(citations_str: Optional[str]) -> Optional[List[Dict[str, Any]]]:
    """
    Parse the citations JSON string from CSV.
    
    Returns:
        List of citation dicts, or None if parsing fails
    """
    if not citations_str or citations_str.strip() == '':
        return None
    
    try:
        citations = json.loads(citations_str)
        
        # Ensure it's a list
        if not isinstance(citations, list):
            logger.warning(f"Citations is not a list: {type(citations)}")
            return None
        
        return citations
    
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse citations JSON: {e}")
        return None


def enrich_record(json_record: Dict[str, Any], csv_row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enrich a JSON record with CSV data by appending new fields.
    
    New fields added:
    - csv_incident_date (parsed from year/month/day)
    - csv_incident_year
    - csv_incident_month
    - csv_incident_day
    - csv_citations (parsed from JSON string)
    - csv_blob_urls
    - csv_enriched_at (timestamp)
    """
    enriched = json_record.copy()
    
    # Parse incident date from separate columns
    incident_date = parse_incident_date(csv_row)
    
    # Parse citations from CSV
    citations_str = csv_row.get('citations', '')
    parsed_citations = parse_citations_json(citations_str)
    
    # Add new fields (with csv_ prefix to avoid conflicts)
    csv_data = {
        'csv_incident_date': incident_date,
        'csv_incident_year': csv_row.get('incident_year', '').strip() or None,
        'csv_incident_month': csv_row.get('incident_month', '').strip() or None,
        'csv_incident_day': csv_row.get('incident_day', '').strip() or None,
        'csv_citations': parsed_citations,
        'csv_blob_urls': csv_row.get('blob_urls', '').strip() or None,
        'csv_enriched_at': datetime.utcnow().isoformat() + 'Z'
    }
    
    # Append to record (at top level, not nested)
    enriched.update(csv_data)
    
    return enriched


def enrich_all_records(
    json_records: List[Dict[str, Any]], 
    csv_lookup: Dict[str, Dict[str, Any]]
) -> tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Enrich all JSON records with CSV data.
    
    Returns:
        Tuple of (enriched_records, stats_dict)
    """
    logger.info("Enriching JSON records with CSV data...")
    
    enriched_records = []
    stats = {
        'total': len(json_records),
        'matched': 0,
        'no_match': 0,
        'missing_case_name': 0,
        'date_parsed': 0,
        'date_failed': 0
    }
    
    for record in json_records:
        # Get provisional_case_name from officer_info
        officer_info = record.get('officer_info', {})
        case_name = officer_info.get('provisional_case_name', '').strip()
        
        if not case_name:
            logger.warning(f"JSON record missing provisional_case_name: {record.get('officer_info', {}).get('mention_uid', 'unknown')}")
            stats['missing_case_name'] += 1
            enriched_records.append(record)
            continue
        
        # Try to find matching CSV row
        csv_row = csv_lookup.get(case_name)
        
        if csv_row:
            # Enrich the record
            enriched = enrich_record(record, csv_row)
            enriched_records.append(enriched)
            stats['matched'] += 1
            
            # Track date parsing success
            if enriched.get('csv_incident_date'):
                stats['date_parsed'] += 1
            else:
                stats['date_failed'] += 1
            
            logger.debug(f"✓ Matched: {case_name}")
        else:
            # No match found - keep original record
            enriched_records.append(record)
            stats['no_match'] += 1
            logger.debug(f"✗ No CSV match: {case_name}")
    
    return enriched_records, stats


def save_json(records: List[Dict[str, Any]], file_path: str):
    """Save enriched records to JSON file."""
    logger.info(f"Saving enriched JSON to: {file_path}")
    
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
    """Print enrichment statistics."""
    logger.info("\n" + "="*80)
    logger.info("ENRICHMENT STATISTICS")
    logger.info("="*80)
    logger.info(f"Total JSON records:            {stats['total']}")
    logger.info(f"Matched with CSV:              {stats['matched']}")
    logger.info(f"  - Dates parsed successfully: {stats['date_parsed']}")
    logger.info(f"  - Dates failed to parse:     {stats['date_failed']}")
    logger.info(f"No CSV match found:            {stats['no_match']}")
    logger.info(f"Missing provisional_case_name: {stats['missing_case_name']}")
    logger.info(f"Match rate:                    {stats['matched'] / stats['total'] * 100:.1f}%")
    if stats['matched'] > 0:
        logger.info(f"Date parse rate:               {stats['date_parsed'] / stats['matched'] * 100:.1f}%")
    logger.info("="*80)


def main():
    """Main execution."""
    try:
        logger.info("="*80)
        logger.info("JSON ENRICHMENT SCRIPT")
        logger.info("="*80)
        
        # Load JSON records
        json_records = load_json(JSON_INPUT)
        
        # Load CSV data
        csv_lookup = load_csv(CSV_INPUT)
        
        # Create backup
        create_backup(JSON_INPUT, JSON_BACKUP)
        
        # Enrich records
        enriched_records, stats = enrich_all_records(json_records, csv_lookup)
        
        # Print statistics
        print_stats(stats)
        
        # Save enriched JSON
        save_json(enriched_records, JSON_OUTPUT)
        
        logger.info("\n✅ Enrichment complete!")
        logger.info(f"\nNext step: Update upload_to_supabase.py to use:")
        logger.info(f"  JSON_FILE = '{JSON_OUTPUT}'")
        logger.info(f"\nThen run: python upload_to_supabase.py")
        
    except FileNotFoundError as e:
        logger.error(f"❌ File error: {e}")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        logger.exception("Full error details:")


if __name__ == "__main__":
    main()