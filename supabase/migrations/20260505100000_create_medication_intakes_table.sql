/*
  # Create medication_intakes table (history of taken/missed)

  1. New table
    - `medication_intakes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK auth.users)
      - `medication_id` (uuid, FK medications)
      - `status` (text: taken | missed)
      - `intake_date` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Policies scoped to owner (`user_id = auth.uid()`)
*/

CREATE TABLE IF NOT EXISTS medication_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('taken', 'missed')),
  intake_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE medication_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own medication intakes"
  ON medication_intakes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medication intakes"
  ON medication_intakes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medication intakes"
  ON medication_intakes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medication intakes"
  ON medication_intakes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS medication_intakes_user_id_idx ON medication_intakes(user_id);
CREATE INDEX IF NOT EXISTS medication_intakes_medication_id_idx ON medication_intakes(medication_id);
CREATE INDEX IF NOT EXISTS medication_intakes_intake_date_idx ON medication_intakes(intake_date);
