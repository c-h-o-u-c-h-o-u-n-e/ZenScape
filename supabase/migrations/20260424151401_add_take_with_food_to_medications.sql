/*
  # Add take_with_food column to medications table

  1. New Columns
    - `take_with_food` (boolean) - Whether the medication should be taken with food
      - Default: false
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'take_with_food'
  ) THEN
    ALTER TABLE medications ADD COLUMN take_with_food boolean DEFAULT false;
  END IF;
END $$;
