/*
  # Add notes to tasks

  Restores a dedicated long-text field for task details, separate from the old
  removed `description` column.
*/

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS notes text;
