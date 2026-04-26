/*
  # Add recurrence fields to tasks

  1. Changes
    - `recurrence_type`: 'none' | 'daily' | 'weekly' | 'custom'
    - `recurrence_interval`: number of days between occurrences (used for 'custom' and 'daily')
    - `recurrence_end_date`: optional end date for the recurrence series

  2. Notes
    - 'none' means no recurrence (default)
    - 'daily' = every day (interval 1)
    - 'weekly' = every 7 days
    - 'custom' = every N days as specified by recurrence_interval
    - Recurrence is computed client-side in the calendar view from the task's due_date
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_type'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_type text NOT NULL DEFAULT 'none'
      CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_interval'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_interval integer DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'recurrence_end_date'
  ) THEN
    ALTER TABLE tasks ADD COLUMN recurrence_end_date date DEFAULT NULL;
  END IF;
END $$;
