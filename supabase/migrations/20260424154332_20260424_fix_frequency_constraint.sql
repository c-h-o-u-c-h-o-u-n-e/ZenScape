/*
  # Fix frequency column constraint

  The frequency column on medications table has a NOT NULL constraint but was
  not being populated by the UI. This migration:
  1. Removes the NOT NULL constraint from frequency
  2. Sets a default value for existing rows where frequency is NULL

  This allows the frequency field to be optional/nullable, fixing the constraint
  violation when creating medications without specifying frequency.
*/

DO $$
BEGIN
  -- First, set a default frequency for any existing NULL values
  UPDATE medications SET frequency = 'Unknown' WHERE frequency IS NULL;
  
  -- Then alter the column to allow NULL values
  ALTER TABLE medications ALTER COLUMN frequency DROP NOT NULL;
  
  -- Set the default for future inserts
  ALTER TABLE medications ALTER COLUMN frequency SET DEFAULT 'Not specified';
END $$;
