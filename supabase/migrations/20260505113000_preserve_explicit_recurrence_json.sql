/*
  # Preserve explicit recurrence JSON from frontend

  Problem:
  - Existing DB triggers were always rebuilding `recurrence` from legacy columns
    (`recurrence_type` + `recurrence_interval`), which collapses monthly/yearly
    rules into daily intervals.

  Fix:
  - If `NEW.recurrence` is explicitly provided by frontend, keep it as-is.
  - Only fallback to legacy conversion when `NEW.recurrence` is NULL.
*/

CREATE OR REPLACE FUNCTION sync_recurrence_jsonb()
RETURNS TRIGGER AS $$
DECLARE
  rule jsonb;
  interval_val integer;
BEGIN
  -- Keep explicit rule sent by frontend (monthly/yearly, etc.)
  IF NEW.recurrence IS NOT NULL THEN
    rule := NEW.recurrence;
  ELSE
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
  END IF;

  IF rule IS NOT NULL AND NEW.recurrence_end_date IS NOT NULL THEN
    rule := rule || jsonb_build_object('end_date', NEW.recurrence_end_date::text);
  END IF;

  NEW.recurrence := rule;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_recurrence_jsonb ON tasks;
CREATE TRIGGER trg_sync_recurrence_jsonb
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_recurrence_jsonb();


CREATE OR REPLACE FUNCTION generate_medication_recurrence()
RETURNS TRIGGER AS $$
BEGIN
  -- Keep explicit rule sent by frontend (monthly/yearly, etc.)
  IF NEW.recurrence IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.recurrence_type IS NOT NULL AND NEW.recurrence_type != 'none' THEN
    NEW.recurrence := jsonb_build_object(
      'freq', CASE
        WHEN NEW.recurrence_type = 'daily' THEN 'daily'
        WHEN NEW.recurrence_type = 'weekly' THEN 'weekly'
        ELSE 'daily'
      END,
      'interval', COALESCE(NEW.recurrence_interval, 1),
      'end_date', NEW.recurrence_end_date
    );
  ELSE
    NEW.recurrence := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS medications_recurrence_trigger ON medications;
CREATE TRIGGER medications_recurrence_trigger
  BEFORE INSERT OR UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION generate_medication_recurrence();
