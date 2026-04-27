/*
  # Add format field to medications

  1. Changes
    - Add `format` column to medications table
    - Format options: Capsule, Comprimé, Crème, Gel, Gouttes, Inhalateur, Injection, Patch, Pommade, Sirop, Suppositoire, Suspension orale
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medications' AND column_name = 'format'
  ) THEN
    ALTER TABLE medications ADD COLUMN format text DEFAULT 'Comprimé';
  END IF;
END $$;
