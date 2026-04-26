/*
  # Add start_time and end_time to tasks

  1. New Columns
    - `start_time` (time) — Optional start time of the task
    - `end_time` (time) — Optional end time of the task
  2. Changes
    - Added two optional time columns to the tasks table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE tasks ADD COLUMN start_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE tasks ADD COLUMN end_time time;
  END IF;
END $$;
