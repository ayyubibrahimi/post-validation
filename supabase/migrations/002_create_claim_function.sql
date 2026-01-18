-- ============================================================================
-- Create SQL function for atomic officer claiming
-- ============================================================================
-- This function ensures that only one validator can claim an officer at a time
-- using FOR UPDATE SKIP LOCKED for row-level locking

CREATE OR REPLACE FUNCTION claim_next_officer(
  validator_id TEXT,
  excluded_mention_uid TEXT DEFAULT NULL
)
RETURNS officer_validations AS $$
DECLARE
  officer officer_validations;
BEGIN
  -- Find and lock next available officer
  -- SKIP LOCKED ensures that if another transaction has locked a row, we skip it
  -- Only selects 'pending' officers (excludes 'skipped', 'being_reviewed', validated officers)
  -- Exclude the specified officer if provided (prevents re-claiming just-skipped officer)
  SELECT * INTO officer
  FROM officer_validations
  WHERE data->'validation'->>'status' = 'pending'
    AND being_reviewed_by IS NULL
    AND (excluded_mention_uid IS NULL OR mention_uid != excluded_mention_uid)
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
