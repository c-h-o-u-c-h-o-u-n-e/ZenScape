/*
  # Drop description columns from goals and tasks

  Removes the `description` column from both the `goals` and `tasks` tables.
  This field is no longer used in the application UI.
*/

ALTER TABLE goals DROP COLUMN IF EXISTS description;
ALTER TABLE tasks DROP COLUMN IF EXISTS description;
