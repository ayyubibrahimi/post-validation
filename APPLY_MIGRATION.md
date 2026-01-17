# Apply Database Migration

The API endpoints require a SQL function `claim_next_officer` to be created in Supabase.

## Instructions

1. Go to your Supabase SQL Editor:
   https://supabase.com/dashboard/project/wcdozjrufdrhkdftqiwb/sql

2. Create a new query

3. Copy and paste the following SQL:

```sql
-- ============================================================================
-- Create SQL function for atomic officer claiming
-- ============================================================================
-- This function ensures that only one validator can claim an officer at a time
-- using FOR UPDATE SKIP LOCKED for row-level locking

CREATE OR REPLACE FUNCTION claim_next_officer(validator_id TEXT)
RETURNS officer_validations AS $$
DECLARE
  officer officer_validations;
BEGIN
  -- Find and lock next available officer
  -- SKIP LOCKED ensures that if another transaction has locked a row, we skip it
  SELECT * INTO officer
  FROM officer_validations
  WHERE data->'validation'->>'status' = 'pending'
    AND being_reviewed_by IS NULL
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If found, claim it
  IF officer.id IS NOT NULL THEN
    UPDATE officer_validations
    SET
      being_reviewed_by = validator_id,
      being_reviewed_at = NOW(),
      data = jsonb_set(data, '{validation,status}', '"being_reviewed"'),
      updated_at = NOW()
    WHERE id = officer.id;

    -- Return updated officer
    SELECT * INTO officer FROM officer_validations WHERE id = officer.id;
  END IF;

  RETURN officer;
END;
$$ LANGUAGE plpgsql;
```

4. Click "Run" to execute the SQL

5. Verify the function was created successfully

6. Run the test script to verify all endpoints work:
   ```bash
   node scripts/test-api-endpoints.js
   ```

## Alternative: Direct File

The SQL is also available in: `supabase/migrations/002_create_claim_function.sql`
