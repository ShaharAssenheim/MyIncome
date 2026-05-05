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

-- Supabase Auth profile sync
-- Creates an application profile for every email/password or Google OAuth signup.
CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  IF EXISTS (SELECT 1 FROM public.auth_users WHERE username = v_username) THEN
    v_username := v_username || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  INSERT INTO public.auth_users (id, email, username, password_hash, google_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    'supabase-auth',
    CASE
      WHEN NEW.app_metadata->>'provider' = 'google' THEN NEW.raw_user_meta_data->>'sub'
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_supabase_user();
