import json
import csv
from typing import Dict, List, Any
import os

def format_employment_stint(stint: Dict[str, Any]) -> str:
    """Format employment stint as: 'AGENCY: START_DATE to END_DATE (REASON)'"""
    agency = stint.get('post_agency_name', '')
    start = stint.get('post_start_date', '').split(' ')[0] if stint.get('post_start_date') else ''
    end = stint.get('post_end_date', '').split(' ')[0] if stint.get('post_end_date') else 'present'
    reason = stint.get('post_separation_reason', '')
    
    stint_str = f"{agency}: {start} to {end}"
    if reason:
        stint_str += f" ({reason})"
    
    return stint_str

def format_citation(citation: Dict[str, Any]) -> str:
    """Format citation as: 'QUOTE | REASONING'"""
    quote = citation.get('quote', '')
    reasoning = citation.get('validator_reasoning', '')
    
    return f"{quote} | {reasoning}"

def format_incident_citation(citation: Dict[str, Any]) -> str:
    """Format incident citation as: 'QUOTE | REASONING'"""
    quote = citation.get('quote', '')
    reasoning = citation.get('validator_reasoning', '')
    
    return f"{quote} | {reasoning}"

def transform_json_to_csv_row(data: Dict[str, Any]) -> Dict[str, Any]:
    """Transform a single JSON record into a CSV row"""
    row = {}
    
    # Core identification
    officer_info = data.get('officer_info', {})
    row['mention_uid'] = officer_info.get('mention_uid', '')
    row['case_name'] = officer_info.get('provisional_case_name', '')
    row['document_link'] = officer_info.get('document_link', '')
    row['match_probability'] = officer_info.get('match_probability', '')
    row['matched_post_id'] = officer_info.get('matched_post_id', '')
    
    # Input officer
    row['input_first_name'] = officer_info.get('first_name', '')
    row['input_middle_name'] = officer_info.get('middle_name', '')
    row['input_last_name'] = officer_info.get('last_name', '')
    row['input_agency'] = officer_info.get('matched_agency', '')
    row['input_incident_date'] = data.get('csv_incident_date', '')
    
    # Agency citations (up to 3)
    citations = data.get('citations', [])
    for i in range(3):
        citation_num = i + 1
        if i < len(citations):
            citation = citations[i]
            row[f'agency_citation_{citation_num}'] = format_citation(citation)
            row[f'agency_citation_{citation_num}_page'] = citation.get('page_number', '')
            row[f'agency_citation_{citation_num}_url'] = citation.get('blob_url', '')
        else:
            row[f'agency_citation_{citation_num}'] = ''
            row[f'agency_citation_{citation_num}_page'] = ''
            row[f'agency_citation_{citation_num}_url'] = ''
    
    # Incident date citations (up to 3)
    csv_citations = data.get('csv_citations', []) or []
    for i in range(3):
        citation_num = i + 1
        if i < len(csv_citations):
            citation = csv_citations[i]
            row[f'incident_citation_{citation_num}'] = format_incident_citation(citation)
            row[f'incident_citation_{citation_num}_page'] = citation.get('page_number', '')
            # Use gdrive_url if available, otherwise blob_url
            row[f'incident_citation_{citation_num}_url'] = citation.get('gdrive_url', '')
        else:
            row[f'incident_citation_{citation_num}'] = ''
            row[f'incident_citation_{citation_num}_page'] = ''
            row[f'incident_citation_{citation_num}_url'] = ''
    
    # Matched officer
    matched_history = data.get('matched_officer_employment_history', [])
    if matched_history:
        first_record = matched_history[0]
        row['matched_first_name'] = first_record.get('post_first_name', '')
        row['matched_middle_name'] = first_record.get('post_middle_name', '')
        row['matched_last_name'] = first_record.get('post_last_name', '')
    else:
        row['matched_first_name'] = ''
        row['matched_middle_name'] = ''
        row['matched_last_name'] = ''
    
    # Matched employment stints (dynamic)
    max_matched_stints = len(matched_history)
    for i, stint in enumerate(matched_history):
        row[f'matched_employment_stint_{i+1}'] = format_employment_stint(stint)
    
    # Other officers
    other_officers = data.get('other_officers_with_same_name', [])
    row['other_officers_count'] = len(other_officers)
    
    # Group other officers by person_nbr
    officers_by_id = {}
    for officer in other_officers:
        person_nbr = officer.get('post_person_nbr', '')
        if person_nbr not in officers_by_id:
            officers_by_id[person_nbr] = {
                'post_id': person_nbr,
                'name': f"{officer.get('post_last_name', '')}, {officer.get('post_first_name', '')} {officer.get('post_middle_name', '') or ''}".strip(),
                'stints': []
            }
        officers_by_id[person_nbr]['stints'].append(officer)
    
    # Add other officers (dynamic)
    for idx, (person_nbr, officer_data) in enumerate(officers_by_id.items(), 1):
        row[f'other_officer_{idx}_post_id'] = officer_data['post_id']
        row[f'other_officer_{idx}_name'] = officer_data['name']
        
        for stint_idx, stint in enumerate(officer_data['stints'], 1):
            row[f'other_officer_{idx}_stint_{stint_idx}'] = format_employment_stint(stint)
    
    # Validation fields
    row['correct'] = ''
    row['notes'] = ''
    
    return row, max_matched_stints, len(officers_by_id), max([len(o['stints']) for o in officers_by_id.values()]) if officers_by_id else 0

def get_all_columns(rows: List[Dict[str, Any]], max_matched_stints: int, max_other_officers: int, max_other_stints: int) -> List[str]:
    """Generate the complete column list in the correct order"""
    columns = [
        # Core identification
        'mention_uid',
        'case_name',
        'document_link',
        'match_probability',
        'matched_post_id',
        
        # Input officer
        'input_first_name',
        'input_middle_name',
        'input_last_name',
        'input_agency',
        'input_incident_date',
        
        # Agency citations
        'agency_citation_1',
        'agency_citation_1_page',
        'agency_citation_1_url',
        'agency_citation_2',
        'agency_citation_2_page',
        'agency_citation_2_url',
        'agency_citation_3',
        'agency_citation_3_page',
        'agency_citation_3_url',
        
        # Incident citations
        'incident_citation_1',
        'incident_citation_1_page',
        'incident_citation_1_url',
        'incident_citation_2',
        'incident_citation_2_page',
        'incident_citation_2_url',
        'incident_citation_3',
        'incident_citation_3_page',
        'incident_citation_3_url',
        
        # Matched officer
        'matched_first_name',
        'matched_middle_name',
        'matched_last_name',
    ]
    
    # Add matched employment stints
    for i in range(1, max_matched_stints + 1):
        columns.append(f'matched_employment_stint_{i}')
    
    # Other officers count
    columns.append('other_officers_count')
    
    # Add other officers and their stints
    for i in range(1, max_other_officers + 1):
        columns.append(f'other_officer_{i}_post_id')
        columns.append(f'other_officer_{i}_name')
        for j in range(1, max_other_stints + 1):
            columns.append(f'other_officer_{i}_stint_{j}')
    
    # Validation
    columns.extend(['correct', 'notes'])
    
    return columns

def csv_to_csv(input_file: str, output_file: str, data_column: str = 'data'):
    """
    Convert CSV with JSONB data column to flattened CSV format
    
    Args:
        input_file: Path to input CSV file from Supabase
        output_file: Path to output CSV file
        data_column: Name of column containing JSON data (default: 'data')
    """
    # Read input CSV
    rows = []
    max_matched_stints = 0
    max_other_officers = 0
    max_other_stints = 0
    
    processed_count = 0
    error_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row_num, csv_row in enumerate(reader, start=2):  # Start at 2 because of header
            try:
                # Extract JSON from data column
                json_str = csv_row.get(data_column, '')
                
                if not json_str:
                    print(f"⚠️  Row {row_num}: Empty data column, skipping")
                    error_count += 1
                    continue
                
                # Parse JSON
                data = json.loads(json_str)
                
                # Transform to CSV row
                row, matched_stints, other_officers, other_stints = transform_json_to_csv_row(data)
                rows.append(row)
                
                max_matched_stints = max(max_matched_stints, matched_stints)
                max_other_officers = max(max_other_officers, other_officers)
                max_other_stints = max(max_other_stints, other_stints)
                
                processed_count += 1
                
                if processed_count % 100 == 0:
                    print(f"   Processed {processed_count} records...")
                    
            except json.JSONDecodeError as e:
                print(f"❌ Row {row_num}: JSON parse error - {e}")
                error_count += 1
            except Exception as e:
                print(f"❌ Row {row_num}: Unexpected error - {e}")
                error_count += 1
    
    if not rows:
        print("❌ No valid records found to process")
        return
    
    # Get all columns in correct order
    columns = get_all_columns(rows, max_matched_stints, max_other_officers, max_other_stints)
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()
        
        for row in rows:
            # Ensure all columns exist in row (fill missing with empty string)
            full_row = {col: row.get(col, '') for col in columns}
            writer.writerow(full_row)
    
    print(f"\n✅ Successfully converted {processed_count} record(s) to {output_file}")
    if error_count > 0:
        print(f"⚠️  {error_count} record(s) had errors and were skipped")
    print(f"\n📊 Statistics:")
    print(f"   Max matched employment stints: {max_matched_stints}")
    print(f"   Max other officers with same name: {max_other_officers}")
    print(f"   Max employment stints per other officer: {max_other_stints}")
    print(f"   Total columns in output: {len(columns)}")

# Example usage
if __name__ == "__main__":
    input_csv = "../data/input/post.csv"
    output_csv = "../data/output/validation_review.csv"
    
    print(f"🔄 Reading from: {input_csv}")
    print(f"📝 Writing to: {output_csv}\n")
    
    csv_to_csv(input_csv, output_csv, data_column='data')