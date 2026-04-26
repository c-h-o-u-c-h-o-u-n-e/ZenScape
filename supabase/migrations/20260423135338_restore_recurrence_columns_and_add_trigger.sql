/*
  # Restore legacy recurrence columns + add recurrence JSONB column

  The frontend uses recurrence_type / recurrence_interval / recurrence_end_date.
  We keep those columns AND maintain the recurrence JSONB column via a trigger so
  the CalendarView can use the rich recurrence engine.

  1. Restore columns if missing
     - recurrence_type  text DEFAULT 'none'
     - recurrence_interval integer
     - recurrence_end_date date

  2. Keep recurrence JSONB column

  3. Trigger: on INSERT or UPDATE auto-populate recurrence JSONB from legacy columns
*/

-- Restore legacy columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='recurrence_type') THEN
    ALTER TABLE tasks ADD COLUMN recurrence_type text NOT NULL DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='recurrence_interval') THEN
    ALTER TABLE tasks ADD COLUMN recurrence_interval integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='recurrence_end_date') THEN
    ALTER TABLE tasks ADD COLUMN recurrence_end_date date;
  END IF;
END $$;

-- Trigger function: sync legacy columns -> recurrence JSONB
CREATE OR REPLACE FUNCTION sync_recurrence_jsonb()
RETURNS TRIGGER AS $$
DECLARE
  rule jsonb;
  interval_val integer;
BEGIN
  interval_val := COALESCE(NEW.recurrence_interval, 1);

  IF NEW.recurrence_type = 'none' OR NEW.recurrence_type IS NULL THEN
    rule := NULL;
  ELSIF NEW.recurrence_type = 'daily' THEN
    rule := jsonb_build_object(
      'freq', 'daily',
      'interval', 1,
      'weekdays_only', false
    );
  ELSIF NEW.recurrence_type = 'weekly' THEN
    rule := jsonb_build_object(
      'freq', 'daily',
      'interval', 7,
      'weekdays_only', false
    );
  ELSIF NEW.recurrence_type = 'custom' THEN
    rule := jsonb_build_object(
      'freq', 'daily',
      'interval', interval_val,
      'weekdays_only', false
    );
  ELSE
    rule := NULL;
  END IF;

  -- Add end_date if present
  IF rule IS NOT NULL AND NEW.recurrence_end_date IS NOT NULL THEN
    rule := rule || jsonb_build_object('end_date', NEW.recurrence_end_date::text);
  END IF;

  NEW.recurrence := rule;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_sync_recurrence_jsonb ON tasks;
CREATE TRIGGER trg_sync_recurrence_jsonb
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_recurrence_jsonb();
