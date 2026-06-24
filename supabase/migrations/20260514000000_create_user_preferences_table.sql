/*
  # Création de la table user_preferences

  1. Nouvelles tables
      - `user_preferences`
        - `id` (uuid, primary key)
        - `user_id` (uuid, FK auth.users)
        - `time_format` (text, '24h' ou '12h')
        - `week_starts_on` (text, 'monday' ou 'sunday')
        - `timezone` (text)
        - `font_family` (text)
        - `search_include_archived_tasks` (boolean)
        - `archive_modal_apply_tag_filters` (boolean)
        - `created_at` (timestamptz)
        - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `user_preferences`
    - Politiques pour que les utilisateurs ne puissent accéder qu'à leurs propres préférences
*/

-- Création de la table user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_format text NOT NULL DEFAULT '24h' CHECK (time_format IN ('24h', '12h')),
  week_starts_on text NOT NULL DEFAULT 'monday' CHECK (week_starts_on IN ('monday', 'sunday')),
  timezone text NOT NULL DEFAULT 'UTC',
  font_family text NOT NULL DEFAULT 'kg-dark-side' CHECK (font_family IN ('kg-dark-side', 'poppins', 'quicksand', 'saira')),
  search_include_archived_tasks boolean NOT NULL DEFAULT false,
  archive_modal_apply_tag_filters boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contrainte d'unicité : un seul enregistrement de préférences par utilisateur
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();