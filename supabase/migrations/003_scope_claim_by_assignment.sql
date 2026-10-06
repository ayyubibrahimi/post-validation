-- ============================================================================
-- Scope officer claiming to a reviewer's assigned set
-- ============================================================================
-- Adds an `assigned_to` filter so each reviewer only ever claims rows that were
-- assigned to them (validation-set exercise). Rows with assigned_to IS NULL are
-- the general pool and are NOT served to named reviewers.
--
-- Prerequisite (run once, see Migration A):
--   ALTER TABLE officer_validations ADD COLUMN IF NOT EXISTS assigned_to TEXT;
--   CREATE INDEX IF NOT EXISTS idx_assigned_to ON officer_validations(assigned_to);

CREATE OR REPLACE FUNCTION claim_next_officer(
  validator_id TEXT,
  excluded_mention_uid TEXT DEFAULT NULL
)
RETURNS officer_validations AS $$
DECLARE
  officer officer_validations;
BEGIN
  -- Find and lock next available officer assigned to this reviewer.
  -- SKIP LOCKED ensures that if another transaction has locked a row, we skip it.
  -- Only selects 'pending' officers whose assigned_to matches the reviewer.
  SELECT * INTO officer
  FROM officer_validations
  WHERE data->'validation'->>'status' = 'pending'
    AND being_reviewed_by IS NULL
    AND assigned_to = validator_id
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
