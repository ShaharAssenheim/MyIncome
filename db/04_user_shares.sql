-- Create user_shares table
-- Tracks shared access between users (who can see whose transactions)

CREATE TABLE IF NOT EXISTS user_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  shared_with_email text NOT NULL,
  shared_with_id uuid REFERENCES auth_users(id) ON DELETE CASCADE,
  can_edit boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_email)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS user_shares_owner_idx ON user_shares(owner_id);
CREATE INDEX IF NOT EXISTS user_shares_shared_with_idx ON user_shares(shared_with_id);
