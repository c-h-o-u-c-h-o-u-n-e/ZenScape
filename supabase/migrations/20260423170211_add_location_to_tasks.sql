/*
  # Add location field to tasks

  1. Modified Tables
    - `tasks` - Add location column to store task location/place information

  2. Details
    - New column `location` (text, nullable) to store where a task takes place
    - Positioned after title for logical organization
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'location'
  ) THEN
    ALTER TABLE tasks ADD COLUMN location text DEFAULT '';
  END IF;
END $$;
