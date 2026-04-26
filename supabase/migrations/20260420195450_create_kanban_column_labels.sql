/*
  # Kanban Column Labels

  1. New Tables
    - `kanban_column_labels`
      - `user_id` (uuid, FK auth.users)
      - `status` (text, one of 'todo','in_progress','done')
      - `label` (text)
      - `updated_at` (timestamptz)
      - Primary key: (user_id, status)
  2. Security
    - Enable RLS
    - Users can manage only their own labels
*/

CREATE TABLE IF NOT EXISTS kanban_column_labels (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  label text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, status)
);

ALTER TABLE kanban_column_labels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_column_labels' AND policyname='Users select own column labels') THEN
    CREATE POLICY "Users select own column labels" ON kanban_column_labels FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_column_labels' AND policyname='Users insert own column labels') THEN
    CREATE POLICY "Users insert own column labels" ON kanban_column_labels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_column_labels' AND policyname='Users update own column labels') THEN
    CREATE POLICY "Users update own column labels" ON kanban_column_labels FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kanban_column_labels' AND policyname='Users delete own column labels') THEN
    CREATE POLICY "Users delete own column labels" ON kanban_column_labels FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;