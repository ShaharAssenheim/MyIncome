-- =============================================================================
-- MyIncome — Complete Database Schema
-- Run once in the Supabase SQL Editor for a fresh install.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. auth_users
--    Profile table. One row per user, id mirrors auth.users.id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text        UNIQUE NOT NULL,
  username     text        UNIQUE NOT NULL,
  password_hash text       NOT NULL,           -- 'supabase-auth' for new signups
  google_id    text        UNIQUE,             -- legacy column, kept for data compat
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_users_email_idx    ON auth_users(email);
CREATE INDEX IF NOT EXISTS auth_users_username_idx ON auth_users(username);
CREATE INDEX IF NOT EXISTS auth_users_google_id_idx ON auth_users(google_id) WHERE google_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  amount      numeric     NOT NULL,
  type        text        NOT NULL,
  description text,
  date        date        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx      ON transactions(date);
CREATE INDEX IF NOT EXISTS transactions_type_idx      ON transactions(type);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, date DESC);


-- ---------------------------------------------------------------------------
-- 3. user_shares
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_shares (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid        NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  shared_with_email text        NOT NULL,
  shared_with_id    uuid        REFERENCES auth_users(id) ON DELETE CASCADE,
  can_edit          boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, shared_with_email)
);

CREATE INDEX IF NOT EXISTS user_shares_owner_idx       ON user_shares(owner_id);
CREATE INDEX IF NOT EXISTS user_shares_shared_with_idx ON user_shares(shared_with_id);


-- ---------------------------------------------------------------------------
-- 4. accessible_users view
--    Returns all user IDs a given user can see (own + shared-with-them).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW accessible_users
  WITH (security_invoker = true)
AS
SELECT
  auth_users.id AS user_id,
  auth_users.id AS accessible_id,
  true          AS is_owner
FROM auth_users
UNION
SELECT
  user_shares.shared_with_id AS user_id,
  user_shares.owner_id       AS accessible_id,
  false                      AS is_owner
FROM user_shares
WHERE user_shares.shared_with_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 5. Supabase Auth trigger
--    Auto-creates an auth_users profile for every new Supabase Auth signup
--    (email/password and Google OAuth).
-- ---------------------------------------------------------------------------
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

  INSERT INTO public.auth_users (id, email, username, password_hash)
  VALUES (NEW.id, NEW.email, v_username, 'supabase-auth')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_supabase_user();


-- ---------------------------------------------------------------------------
-- 6. Import existing users into Supabase Auth  (run once on migration)
--    Preserves bcrypt passwords so users don't need to reset them.
--    Skip this block on a fresh install.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, raw_user_meta_data,
  created_at, updated_at, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
SELECT
  au.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  au.email,
  CASE WHEN au.password_hash IN ('oauth-google', 'supabase-auth') THEN '' ELSE au.password_hash END,
  COALESCE(au.created_at, now()),
  jsonb_build_object('username', au.username),
  COALESCE(au.created_at, now()),
  COALESCE(au.created_at, now()),
  'authenticated', 'authenticated',
  '', '', '', ''
FROM public.auth_users au
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id,
  created_at, updated_at, last_sign_in_at
)
SELECT
  au.id, au.id,
  jsonb_build_object('sub', au.id::text, 'email', au.email),
  'email', au.email,
  COALESCE(au.created_at, now()),
  COALESCE(au.created_at, now()),
  COALESCE(au.created_at, now())
FROM public.auth_users au
WHERE au.password_hash NOT IN ('oauth-google', 'supabase-auth')
ON CONFLICT (provider, provider_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 7. Row Level Security
--    API routes use the service role key which bypasses RLS entirely.
--    These policies protect the tables if the anon key is ever used directly.
-- ---------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE auth_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shares  ENABLE ROW LEVEL SECURITY;

-- ---- auth_users policies ----

-- Users can read their own profile + profiles of people they share with / share to
CREATE POLICY "auth_users: select own and related"
ON auth_users FOR SELECT
USING (
  id = auth.uid()
  OR id IN (SELECT owner_id      FROM user_shares WHERE shared_with_id = auth.uid())
  OR id IN (SELECT shared_with_id FROM user_shares WHERE owner_id = auth.uid() AND shared_with_id IS NOT NULL)
);

-- Users can only update their own profile
CREATE POLICY "auth_users: update own"
ON auth_users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Inserts are handled by the SECURITY DEFINER trigger; block direct inserts via anon key
CREATE POLICY "auth_users: no direct insert"
ON auth_users FOR INSERT
WITH CHECK (false);


-- ---- transactions policies ----

-- Read own transactions + transactions of users who shared with the current user
CREATE POLICY "transactions: select own and shared"
ON transactions FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_shares
    WHERE owner_id = transactions.user_id
      AND shared_with_id = auth.uid()
  )
);

-- Insert only for own user_id
CREATE POLICY "transactions: insert own"
ON transactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update own transactions + shared users with can_edit = true
CREATE POLICY "transactions: update own and editable shares"
ON transactions FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_shares
    WHERE owner_id = transactions.user_id
      AND shared_with_id = auth.uid()
      AND can_edit = true
  )
);

-- Delete own transactions + shared users with can_edit = true
CREATE POLICY "transactions: delete own and editable shares"
ON transactions FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_shares
    WHERE owner_id = transactions.user_id
      AND shared_with_id = auth.uid()
      AND can_edit = true
  )
);


-- ---- user_shares policies ----

-- Owner sees all their shares; recipient sees shares they appear in
CREATE POLICY "user_shares: select own"
ON user_shares FOR SELECT
USING (
  owner_id = auth.uid()
  OR shared_with_id = auth.uid()
);

CREATE POLICY "user_shares: insert own"
ON user_shares FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "user_shares: update own"
ON user_shares FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "user_shares: delete own"
ON user_shares FOR DELETE
USING (owner_id = auth.uid());
