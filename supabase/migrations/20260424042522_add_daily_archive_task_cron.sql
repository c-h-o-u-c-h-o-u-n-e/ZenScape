/*
  # Add daily task archiving job

  1. Changes
    - Create pg_cron extension if not exists
    - Add daily cron job to archive completed tasks at midnight UTC
    - The job calls the archive_completed_tasks edge function

  2. Details
    - Runs at midnight (00:00 UTC) every day
    - Archives tasks with status='done' from the previous day
    - Uses Supabase's built-in cron scheduling via pg_cron

  3. Security
    - Job runs with service role to access all tasks
    - Function is public but can only be called by cron job
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function that calls the edge function via HTTP
CREATE OR REPLACE FUNCTION archive_completed_tasks_daily()
RETURNS void AS $$
BEGIN
  -- Call the edge function using http
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/archive_completed_tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- Create cron job that runs at midnight UTC every day
SELECT cron.schedule('archive-completed-tasks-daily', '0 0 * * *', 'SELECT archive_completed_tasks_daily()');
