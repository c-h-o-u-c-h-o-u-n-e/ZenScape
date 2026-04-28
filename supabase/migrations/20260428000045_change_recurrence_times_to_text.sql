/*
  # Change recurrence_times to text type for fraction support

  1. Changes
    - Convert `recurrence_times` column from integer to text
    - Allow storage of fractional values like "¼", "½", "¾" in addition to whole numbers
    - Migrate existing integer values to text
*/

DO $$
BEGIN
  -- Rename old column
  ALTER TABLE medications RENAME COLUMN recurrence_times TO recurrence_times_old;
  
  -- Create new text column
  ALTER TABLE medications ADD COLUMN recurrence_times text DEFAULT NULL;
  
  -- Migrate data: convert integers to text, handle nulls
  UPDATE medications
  SET recurrence_times = CASE
    WHEN recurrence_times_old IS NOT NULL AND recurrence_times_old > 0 
      THEN recurrence_times_old::text
    ELSE NULL
  END;
  
  -- Drop old column
  ALTER TABLE medications DROP COLUMN recurrence_times_old;
END $$;
