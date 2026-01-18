
# Officer Validations Data Structure

## Supabase Table: `officer_validations`

### Schema

```sql
officer_validations
├── id (UUID, primary key)
├── mention_uid (TEXT) - Extracted from data for indexing
├── provisional_case_name (TEXT) - Extracted from data for indexing
├── data (JSONB) - Full officer validation record
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### JSONB Data Structure (`data` column)

Each record in the `data` column contains:

```json
{
  "officer_info": {
    "mention_uid": "mention_12345",
    "provisional_case_name": "1740746809089-vzt",
    "document_link": "https://...",
    "matched_post_id": "B05-C48",
    "match_probability": 0.8052,
    "first_name": "MICHAEL",
    "middle_name": "JAMES",
    "last_name": "WEBB",
    "matched_agency": "SAN DIEGO POLICE DEPARTMENT",
    "mentioned_agencies": "None",
    "total_employment_stints": 4,
    "other_officers_summary": "10 unique officer(s), 16 total record(s)"
  },
  "other_officers_with_same_name": [
    {
      "post_person_nbr": "A25-D11",
      "post_first_name": "MICHAEL",
      "post_middle_name": "D",
      "post_last_name": "WEBB",
      "post_agency_name": "ANAHEIM POLICE DEPARTMENT",
      "post_start_date": "2010-01-15",
      "post_end_date": "2015-06-30"
    }
  ],
  "matched_officer_employment_history": [
    {
      "post_person_nbr": "B05-C48",
      "post_first_name": "MICHAEL",
      "post_middle_name": "JAMES",
      "post_last_name": "WEBB",
      "post_agency_name": "SAN DIEGO POLICE DEPARTMENT",
      "post_start_date": "1989-07-01",
      "post_end_date": "2016-10-15",
      "separation_reason": "Retired"
    }
  ],
  "validation": {
    "status": "pending",
    "validated_by": null,
    "validated_at": null,
    "notes": null
  },
  "citations": [
    {
      "file_name": "incident_report_2016.pdf",
      "file_id": "a1b2c3d4e5f6...",
      "page_number": 3,
      "quote": "Officer Michael Webb of San Diego PD responded...",
      "validator_reasoning": "Citation correctly links officer to agency",
      "agency_name": "SAN DIEGO POLICE DEPARTMENT",
      "blob_url": "https://...blob.core.windows.net/.../a1b2c3d4e5f6...?sv=...",
      "url_error": null
    }
  ],
  "citation_count": 1,
  "success": true,
  "error": null
}
```

one