/*
  # Add color column to goals

  Adds a `color` column to the `goals` table to allow users to pick a custom
  background color for the task cards of each goal.

  ## Changes
  - `goals.color` (text, nullable) — hex color string (e.g. '#e63946'). When null,
    the existing hash-based palette fallback is used.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'color'
  ) THEN
    ALTER TABLE goals ADD COLUMN color text;
  END IF;
END $$;
