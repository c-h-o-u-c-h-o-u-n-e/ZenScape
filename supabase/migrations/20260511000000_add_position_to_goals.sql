-- Add position field to goals table for drag and drop ordering
ALTER TABLE goals ADD COLUMN IF NOT EXISTS position float NOT NULL DEFAULT 0;

-- Create index for position ordering
CREATE INDEX IF NOT EXISTS goals_position_idx ON goals(position);

-- Update existing goals to have sequential positions
WITH numbered_goals AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM goals
)
UPDATE goals
SET position = numbered_goals.rn * 1000
FROM numbered_goals
WHERE goals.id = numbered_goals.id;
