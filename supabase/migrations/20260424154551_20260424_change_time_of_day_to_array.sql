/*
  # Change time_of_day to support multiple times

  Changes time_of_day from a single text value to a text array (jsonb)
  to allow medications to be taken at multiple times per day.

  1. Changes
    - Convert time_of_day column from text to jsonb (array of times)
    - Migrate existing single values to arrays
    - Update default value

  2. Migration
    - Any existing single time values are converted to single-element arrays
    - Empty values become empty arrays
*/

DO $$
BEGIN
  -- Rename old column
  ALTER TABLE medications RENAME COLUMN time_of_day TO time_of_day_old;
  
  -- Create new jsonb column with array of times
  ALTER TABLE medications ADD COLUMN time_of_day jsonb DEFAULT '[]'::jsonb;
  
  -- Migrate data: convert single text values to arrays
  UPDATE medications
  SET time_of_day = CASE
    WHEN time_of_day_old IS NOT NULL AND time_of_day_old != '' 
      THEN jsonb_build_array(time_of_day_old)
    ELSE '[]'::jsonb
  END;
  
  -- Drop old column
  ALTER TABLE medications DROP COLUMN time_of_day_old;
  
  -- Set NOT NULL constraint
  ALTER TABLE medications ALTER COLUMN time_of_day SET NOT NULL;
END $$;
