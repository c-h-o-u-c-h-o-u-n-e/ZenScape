drop extension if exists "pg_net";

alter table "public"."tasks" drop constraint "tasks_recurrence_type_check";

alter table "public"."tasks" add column "recurrence" jsonb;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.archive_completed_tasks_daily()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
$function$
;


