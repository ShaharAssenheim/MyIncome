-- Create auth_users table
-- Stores user authentication information

CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  google_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS auth_users_email_idx ON auth_users(email);
CREATE INDEX IF NOT EXISTS auth_users_username_idx ON auth_users(username);
CREATE INDEX IF NOT EXISTS auth_users_google_id_idx ON auth_users(google_id) WHERE google_id IS NOT NULL;
