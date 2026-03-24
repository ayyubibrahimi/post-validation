import json
import csv
from typing import Dict, List, Any, Tuple, Optional
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


# ==============================================================================
# OPTIONAL FILTER — comment/uncomment the body of this function to toggle
# When active: rows with no agency citations OR no date citations are dropped
# ==============================================================================
def should_include_row(data: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Returns (True, '') if the row should be included, or (False, reason) if not.

    Toggle the filter by commenting/uncommenting the block below.
    """
    # ---- FILTER ON (comment out this block to disable) ----------------------
    # has_agency_citation = bool(data.get('citations'))
    # has_date_citation = bool(data.get('csv_citations'))

    # if not has_agency_citation and not has_date_citation:
    #     return False, "missing both agency citation and date citation"
    # if not has_agency_citation:
    #     return False, "missing agency citation"
    # if not has_date_citation:
    #     return False, "missing date citation"
    # ---- END FILTER ---------------------------------------------------------

    return True, ''


def transform_json_to_csv_row(data: Dict[str, Any]) -> Tuple[Dict[str, Any], int, int, int]:
    """Transform a single JSON record into a CSV row."""
    row = {}

    # ── Core identification ───────────────────────────────────────────────────
    officer_info = data.get('officer_info', {})
    row['mention_uid']      = officer_info.get('mention_uid', '')
    row['case_name']        = officer_info.get('provisional_case_name', '')
    row['document_link']    = officer_info.get('document_link', '')
    row['match_probability']= officer_info.get('match_probability', '')
    row['matched_post_id']  = officer_info.get('matched_post_id', '')

    # ── Input officer ─────────────────────────────────────────────────────────
    row['input_first_name']  = officer_info.get('first_name', '')
    row['input_middle_name'] = officer_info.get('middle_name', '')
    row['input_last_name']   = officer_info.get('last_name', '')
    row['input_agency']      = officer_info.get('matched_agency', '')
    row['input_incident_date'] = data.get('csv_incident_date', '')

    # ── Agency citations (up to 3) ────────────────────────────────────────────
    citations = data.get('citations', []) or []
    for i in range(3):
        n = i + 1
        if i < len(citations):
            c = citations[i]
            row[f'agency_citation_{n}']      = format_citation(c)
            row[f'agency_citation_{n}_page'] = c.get('page_number', '')
            row[f'agency_citation_{n}_url']  = c.get('blob_url', '')
        else:
            row[f'agency_citation_{n}']      = ''
            row[f'agency_citation_{n}_page'] = ''
            row[f'agency_citation_{n}_url']  = ''

    # ── Incident date citations (up to 3) ─────────────────────────────────────
    csv_citations = data.get('csv_citations', []) or []
    for i in range(3):
        n = i + 1
        if i < len(csv_citations):
            c = csv_citations[i]
            row[f'incident_citation_{n}']      = format_incident_citation(c)
            row[f'incident_citation_{n}_page'] = c.get('page_number', '')
            row[f'incident_citation_{n}_url']  = c.get('gdrive_url', '')
        else:
            row[f'incident_citation_{n}']      = ''
            row[f'incident_citation_{n}_page'] = ''
            row[f'incident_citation_{n}_url']  = ''

    # ── Matched officer ───────────────────────────────────────────────────────
    matched_history = data.get('matched_officer_employment_history', []) or []
    if matched_history:
        first = matched_history[0]
        row['matched_first_name']  = first.get('post_first_name', '')
        row['matched_middle_name'] = first.get('post_middle_name', '')
        row['matched_last_name']   = first.get('post_last_name', '')
    else:
        row['matched_first_name']  = ''
        row['matched_middle_name'] = ''
        row['matched_last_name']   = ''

    max_matched_stints = len(matched_history)
    for i, stint in enumerate(matched_history):
        row[f'matched_employment_stint_{i + 1}'] = format_employment_stint(stint)

    # ── Other officers with same name ─────────────────────────────────────────
    other_officers = data.get('other_officers_with_same_name', []) or []
    row['other_officers_count'] = len(other_officers)

    # Group by person_nbr so each unique officer is one column group
    officers_by_id: Dict[str, Dict] = {}
    for officer in other_officers:
        pid = officer.get('post_person_nbr', '')
        if pid not in officers_by_id:
            middle = officer.get('post_middle_name') or ''
            name = f"{officer.get('post_last_name', '')}, {officer.get('post_first_name', '')} {middle}".strip().rstrip(',')
            officers_by_id[pid] = {'post_id': pid, 'name': name, 'stints': []}
        officers_by_id[pid]['stints'].append(officer)

    for idx, (pid, od) in enumerate(officers_by_id.items(), 1):
        row[f'other_officer_{idx}_post_id'] = od['post_id']
        row[f'other_officer_{idx}_name']    = od['name']
        for j, stint in enumerate(od['stints'], 1):
            row[f'other_officer_{idx}_stint_{j}'] = format_employment_stint(stint)

    # ── Validation ────────────────────────────────────────────────────────────
    row['correct'] = ''
    row['notes']   = ''

    max_other_officers = len(officers_by_id)
    max_other_stints   = max((len(o['stints']) for o in officers_by_id.values()), default=0)

    return row, max_matched_stints, max_other_officers, max_other_stints


def get_all_columns(
    max_matched_stints: int,
    max_other_officers: int,
    max_other_stints: int,
) -> List[str]:
    """Generate the complete ordered column list."""
    columns = [
        # Core
        'mention_uid', 'case_name', 'document_link', 'match_probability', 'matched_post_id',
        # Input officer
        'input_first_name', 'input_middle_name', 'input_last_name', 'input_agency', 'input_incident_date',
        # Agency citations
        'agency_citation_1', 'agency_citation_1_page', 'agency_citation_1_url',
        'agency_citation_2', 'agency_citation_2_page', 'agency_citation_2_url',
        'agency_citation_3', 'agency_citation_3_page', 'agency_citation_3_url',
        # Incident citations
        'incident_citation_1', 'incident_citation_1_page', 'incident_citation_1_url',
        'incident_citation_2', 'incident_citation_2_page', 'incident_citation_2_url',
        'incident_citation_3', 'incident_citation_3_page', 'incident_citation_3_url',
        # Matched officer
        'matched_first_name', 'matched_middle_name', 'matched_last_name',
    ]

    for i in range(1, max_matched_stints + 1):
        columns.append(f'matched_employment_stint_{i}')

    columns.append('other_officers_count')

    for i in range(1, max_other_officers + 1):
        columns.append(f'other_officer_{i}_post_id')
        columns.append(f'other_officer_{i}_name')
        for j in range(1, max_other_stints + 1):
            columns.append(f'other_officer_{i}_stint_{j}')

    columns += ['correct', 'notes']
    return columns


def csv_to_csv(input_file: str, output_file: str, data_column: str = 'data'):
    """
    Convert a Supabase CSV (with a JSONB data column) to a flattened review CSV.

    Args:
        input_file:   Path to input CSV downloaded from Supabase
        output_file:  Path for output CSV
        data_column:  Name of the column containing JSON data (default: 'data')
    """
    rows: List[Dict[str, Any]] = []
    max_matched_stints = 0
    max_other_officers = 0
    max_other_stints   = 0

    processed_count = 0
    filtered_count  = 0
    error_count     = 0

    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row_num, csv_row in enumerate(reader, start=2):
            try:
                json_str = csv_row.get(data_column, '')
                if not json_str:
                    print(f"⚠️  Row {row_num}: Empty data column, skipping")
                    error_count += 1
                    continue

                data = json.loads(json_str)

                # ── Optional filter ───────────────────────────────────────────
                include, reason = should_include_row(data)
                if not include:
                    filtered_count += 1
                    print(f"🔽 Row {row_num}: Filtered out — {reason}")
                    continue
                # ─────────────────────────────────────────────────────────────

                row, ms, oo, os_ = transform_json_to_csv_row(data)
                rows.append(row)

                max_matched_stints = max(max_matched_stints, ms)
                max_other_officers = max(max_other_officers, oo)
                max_other_stints   = max(max_other_stints, os_)

                processed_count += 1
                if processed_count % 100 == 0:
                    print(f"   Processed {processed_count} records...")

            except json.JSONDecodeError as e:
                print(f"❌ Row {row_num}: JSON parse error — {e}")
                error_count += 1
            except Exception as e:
                print(f"❌ Row {row_num}: Unexpected error — {e}")
                error_count += 1

    if not rows:
        print("❌ No valid records found to process")
        return

    columns = get_all_columns(max_matched_stints, max_other_officers, max_other_stints)

    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
        writer.writeheader()
        for row in rows:
            writer.writerow({col: row.get(col, '') for col in columns})

    print(f"\n✅ Done — {processed_count} record(s) written to {output_file}")
    if filtered_count:
        print(f"🔽 {filtered_count} record(s) filtered out (missing citations)")
    if error_count:
        print(f"⚠️  {error_count} record(s) skipped due to errors")
    print(f"\n📊 Output shape:")
    print(f"   Rows    : {processed_count}")
    print(f"   Columns : {len(columns)}")
    print(f"   Max matched employment stints    : {max_matched_stints}")
    print(f"   Max other officers with same name: {max_other_officers}")
    print(f"   Max stints per other officer     : {max_other_stints}")


if __name__ == "__main__":
    input_csv  = "../data/input/officer_validations_rows.csv"
    output_csv = "../data/output/validation_review.csv"

    print(f"🔄 Reading from : {input_csv}")
    print(f"📝 Writing to   : {output_csv}\n")

    csv_to_csv(input_csv, output_csv, data_column='data')