/*
  # Add recurrence_times field to medications

  1. Changes
    - Add `recurrence_times` column to medications table to store how many times per interval
    - Store the number of times a medication should be taken (e.g., "2 times" in "take 2 times every 3 days")
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'recurrence_times'
  ) THEN
    ALTER TABLE medications ADD COLUMN recurrence_times integer DEFAULT 0;
  END IF;
END $$;
