/*
  # Add archived field to tasks

  ## Summary
  Adds an `archived` boolean column to the `tasks` table to support task archiving
  in the Kanban board view. Archived tasks are hidden from the main Kanban board
  but remain visible in the Calendar view and in a dedicated archived tasks panel.

  ## Changes
  - `tasks` table: new `archived` column (boolean, default false)

  ## Notes
  - Existing tasks default to `archived = false` (not archived)
  - RLS policies already in place on tasks table are unchanged
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'archived'
  ) THEN
    ALTER TABLE tasks ADD COLUMN archived boolean NOT NULL DEFAULT false;
  END IF;
END $$;
