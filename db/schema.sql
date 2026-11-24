-- MyIncome: complete current schema for a Supabase PostgreSQL project.
-- Creates structure, policies and triggers; financial records come from a private export.
-- Safe to reapply to schema version 2. Does not rewrite or delete financial data.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '60s';

DO $guard$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['transactions','shahar_salaries','monthly_income_overrides','finance_datasets',
    'bank_transactions','bank_imports','auth_refresh_tokens','user_shares'] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      RAISE EXCEPTION 'Legacy table % still exists. Migrate and verify its data before applying the current schema',v_table;
    END IF;
  END LOOP;
END;
$guard$;

CREATE TABLE IF NOT EXISTS public.auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text NOT NULL,
  password_hash text NOT NULL,
  google_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_users_email_idx ON public.auth_users(email);
CREATE INDEX IF NOT EXISTS auth_users_username_idx ON public.auth_users(username);
CREATE INDEX IF NOT EXISTS auth_users_google_id_idx ON public.auth_users(google_id) WHERE google_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.site_allowed_emails (
  email text PRIMARY KEY CHECK (email = lower(trim(email))),
  approved_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_allowed_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_allowed_emails FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.site_allowed_emails TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.auth_users TO authenticated;
REVOKE ALL ON public.auth_users FROM PUBLIC,anon;
GRANT ALL ON public.auth_users TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_site_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF lower(NEW.email) IS DISTINCT FROM 'shacharassen3667@gmail.com'
    AND NOT EXISTS (SELECT 1 FROM public.site_allowed_emails WHERE email = lower(NEW.email)) THEN
    RAISE EXCEPTION 'This email is not approved for site access';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_supabase_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
BEGIN
  -- Derive a username: prefer explicit username meta, then Google full_name, then email prefix
  v_username := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'username', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  -- Ensure uniqueness by appending a short UUID fragment when needed
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
      WHEN NEW.raw_app_meta_data->>'provider' = 'google'
      THEN NEW.raw_user_meta_data->>'sub'
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_site_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
    AND (lower(u.email) = 'shacharassen3667@gmail.com'
      OR EXISTS (SELECT 1 FROM public.site_allowed_emails a WHERE a.email = lower(u.email)))
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_site_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL AND lower(u.email) = 'shacharassen3667@gmail.com');
$function$
;

REVOKE ALL ON FUNCTION public.enforce_site_signup(),public.handle_new_supabase_user() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_site_signup(),public.handle_new_supabase_user() TO service_role;
REVOKE ALL ON FUNCTION public.has_site_access(),public.is_site_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_site_access(),public.is_site_admin() TO anon,authenticated,service_role;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_supabase_user();
DROP TRIGGER IF EXISTS enforce_site_signup ON auth.users;
CREATE TRIGGER enforce_site_signup BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.enforce_site_signup();

DROP POLICY IF EXISTS "auth_users: no direct insert" ON public.auth_users;
CREATE POLICY "auth_users: no direct insert" ON public.auth_users AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (false);
DROP POLICY IF EXISTS "auth_users: select own" ON public.auth_users;
CREATE POLICY "auth_users: select own" ON public.auth_users AS PERMISSIVE FOR SELECT TO "authenticated" USING ((id = ( SELECT auth.uid() AS uid)));
DROP POLICY IF EXISTS "auth_users: update own" ON public.auth_users;
CREATE POLICY "auth_users: update own" ON public.auth_users AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
DROP POLICY IF EXISTS "site_admin_delete" ON public.auth_users;
CREATE POLICY "site_admin_delete" ON public.auth_users AS RESTRICTIVE FOR DELETE TO "authenticated" USING (is_site_admin());
DROP POLICY IF EXISTS "site_admin_insert" ON public.auth_users;
CREATE POLICY "site_admin_insert" ON public.auth_users AS RESTRICTIVE FOR INSERT TO "authenticated" WITH CHECK (is_site_admin());
DROP POLICY IF EXISTS "site_admin_update" ON public.auth_users;
CREATE POLICY "site_admin_update" ON public.auth_users AS RESTRICTIVE FOR UPDATE TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());
DROP POLICY IF EXISTS "site_admin_write" ON public.auth_users;
CREATE POLICY "site_admin_write" ON public.auth_users AS PERMISSIVE FOR ALL TO "authenticated" USING (is_site_admin()) WITH CHECK (is_site_admin());
DROP POLICY IF EXISTS "site_admission" ON public.auth_users;
CREATE POLICY "site_admission" ON public.auth_users AS RESTRICTIVE FOR ALL TO "authenticated" USING (has_site_access()) WITH CHECK (has_site_access());


CREATE TABLE IF NOT EXISTS public.shahar_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.auth_users(id),
  income_date date NOT NULL,
  payment_date date,
  amount numeric(18,2) NOT NULL CHECK (amount <> 'NaN'::numeric),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','bit','bank')),
  is_salary boolean NOT NULL DEFAULT false,
  description text,
  employer text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.shahar_income.income_date IS 'The work/income date used in totals; never derived from another table.';
COMMENT ON COLUMN public.shahar_income.payment_date IS 'Original receipt date, when known; independent of the income date.';
CREATE INDEX IF NOT EXISTS shahar_income_active_date_idx ON public.shahar_income(income_date DESC,id) WHERE NOT is_deleted;

CREATE TABLE IF NOT EXISTS public.kristin_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.auth_users(id),
  income_date date NOT NULL,
  payment_date date,
  amount numeric(18,2) NOT NULL CHECK (amount <> 'NaN'::numeric),
  payment_method text NOT NULL CHECK (payment_method IN ('cash','bit','bank')),
  is_salary boolean NOT NULL DEFAULT false,
  description text,
  employer text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kristin_income_active_date_idx ON public.kristin_income(income_date DESC,id) WHERE NOT is_deleted;

CREATE TABLE IF NOT EXISTS public.income_month_overrides (
  person text NOT NULL CHECK (person IN ('shahar','kristin')),
  income_month date NOT NULL CHECK (extract(day FROM income_month) = 1),
  cash_amount numeric(18,2) NOT NULL CHECK (cash_amount >= 0 AND cash_amount <> 'NaN'::numeric),
  bit_amount numeric(18,2) NOT NULL CHECK (bit_amount >= 0 AND bit_amount <> 'NaN'::numeric),
  bank_amount numeric(18,2) NOT NULL CHECK (bank_amount >= 0 AND bank_amount <> 'NaN'::numeric),
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(person,income_month)
);

CREATE TABLE IF NOT EXISTS public.cash_monthly_balances (
  balance_month date PRIMARY KEY CHECK (extract(day FROM balance_month) = 1),
  balance_date date,
  balance numeric(18,2) CHECK (balance <> 'NaN'::numeric),
  reference_balance numeric(18,2) CHECK (reference_balance <> 'NaN'::numeric),
  CHECK ((balance IS NULL) = (balance_date IS NULL)),
  CHECK (balance IS NOT NULL OR reference_balance IS NOT NULL),
  CHECK (balance_date >= balance_month AND balance_date < balance_month + interval '1 month')
);

CREATE TABLE IF NOT EXISTS public.investment_assets (
  asset_key text PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  asset_type text NOT NULL CHECK (asset_type IN ('deposit','money_market','stocks','other')),
  display_color text NOT NULL CHECK (display_color ~ '^#[0-9a-fA-F]{6}$'),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  current_value numeric(18,2) CHECK (current_value <> 'NaN'::numeric),
  valuation_date date,
  CHECK ((current_value IS NULL) = (valuation_date IS NULL))
);

CREATE TABLE IF NOT EXISTS public.savings_monthly_snapshots (
  snapshot_month date PRIMARY KEY CHECK (extract(day FROM snapshot_month) = 1),
  snapshot_date date NOT NULL,
  cash_balance numeric(18,2) NOT NULL CHECK (cash_balance <> 'NaN'::numeric),
  reported_total numeric(18,2) NOT NULL CHECK (reported_total <> 'NaN'::numeric),
  quality text NOT NULL CHECK (quality IN ('verified_cash','estimate','mixed_dates')),
  CHECK (snapshot_date >= snapshot_month AND snapshot_date < snapshot_month + interval '1 month')
);
COMMENT ON COLUMN public.savings_monthly_snapshots.reported_total IS 'Original reported total, including historical rounding; do not replace with a re-sum of rounded components.';

CREATE TABLE IF NOT EXISTS public.savings_snapshot_assets (
  snapshot_month date NOT NULL REFERENCES public.savings_monthly_snapshots(snapshot_month) ON DELETE CASCADE,
  asset_key text NOT NULL REFERENCES public.investment_assets(asset_key),
  value numeric(18,2) NOT NULL CHECK (value <> 'NaN'::numeric AND value <> 0),
  PRIMARY KEY(snapshot_month,asset_key)
);
COMMENT ON TABLE public.savings_snapshot_assets IS 'Nonzero balances of each asset in a monthly snapshot. A missing asset row means zero in that snapshot.';

CREATE TABLE IF NOT EXISTS public.finance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount <> 'NaN'::numeric),
  description text NOT NULL DEFAULT '',
  display_order integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public.finance_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  schema_version integer NOT NULL DEFAULT 2 CHECK (schema_version = 2),
  owner_id uuid NOT NULL REFERENCES public.auth_users(id),
  snapshot_date date NOT NULL,
  profit_shown_in_portfolio numeric(18,2) NOT NULL CHECK (profit_shown_in_portfolio <> 'NaN'::numeric),
  notes text[] NOT NULL DEFAULT '{}',
  sources text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.retirement_accounts (
  id text PRIMARY KEY CHECK (length(trim(id)) > 0),
  person text NOT NULL CHECK (person IN ('shahar','kristin')),
  product text NOT NULL CHECK (product IN ('pension','study_fund')),
  provider text NOT NULL CHECK (length(trim(provider)) > 0),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  fund_type text NOT NULL CHECK (fund_type IN ('comprehensive','supplementary','study_fund')),
  joined_on date,
  notes text[] NOT NULL DEFAULT '{}',
  CHECK ((product = 'study_fund') = (fund_type = 'study_fund'))
);
CREATE INDEX IF NOT EXISTS retirement_accounts_person_product_idx ON public.retirement_accounts(person,product);

CREATE TABLE IF NOT EXISTS public.retirement_reports (
  id text PRIMARY KEY CHECK (length(trim(id)) > 0),
  account_id text NOT NULL REFERENCES public.retirement_accounts(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  report_kind text NOT NULL CHECK (report_kind IN ('annual','ytd')),
  opening_balance numeric(18,2) NOT NULL,
  closing_balance numeric(18,2) NOT NULL,
  employee_contributions numeric(18,2) NOT NULL,
  employer_contributions numeric(18,2) NOT NULL,
  severance_contributions numeric(18,2) NOT NULL,
  contributions_total numeric(18,2) NOT NULL,
  investment_gains numeric(18,2) NOT NULL,
  transfers_in numeric(18,2) NOT NULL,
  transfers_out numeric(18,2) NOT NULL,
  management_fees numeric(18,2) NOT NULL,
  fee_refunds numeric(18,2) NOT NULL,
  disability_cost numeric(18,2) NOT NULL,
  survivor_cost numeric(18,2) NOT NULL,
  actuarial_adjustment numeric(18,2) NOT NULL,
  balance_adjustment numeric(18,2) NOT NULL,
  reported_precision smallint NOT NULL CHECK (reported_precision IN (0,2)),
  source_file text NOT NULL CHECK (length(trim(source_file)) > 0),
  source_pages integer[] NOT NULL CHECK (cardinality(source_pages) > 0 AND 0 < ALL(source_pages)),
  notes text[] NOT NULL DEFAULT '{}',
  UNIQUE(account_id,period_end),
  CHECK (extract(month FROM period_start) = 1 AND extract(day FROM period_start) = 1),
  CHECK (period_end >= period_start AND period_end < period_start + interval '1 year'),
  CHECK (report_kind <> 'annual' OR (extract(month FROM period_end) = 12 AND extract(day FROM period_end) = 31)),
  CHECK (opening_balance >= 0 AND closing_balance >= 0 AND employee_contributions >= 0
    AND employer_contributions >= 0 AND severance_contributions >= 0 AND contributions_total >= 0
    AND transfers_in >= 0 AND transfers_out >= 0 AND management_fees >= 0 AND fee_refunds >= 0
    AND disability_cost >= 0 AND survivor_cost >= 0),
  CHECK ('NaN'::numeric <> ALL(ARRAY[opening_balance,closing_balance,employee_contributions,employer_contributions,
    severance_contributions,contributions_total,investment_gains,transfers_in,transfers_out,management_fees,
    fee_refunds,disability_cost,survivor_cost,actuarial_adjustment,balance_adjustment]))
);
COMMENT ON TABLE public.retirement_reports IS 'Canonical calendar-year statements, including YTD reports. Transfers are separate from contributions and gains. Preserve reported totals and source rounding.';

CREATE OR REPLACE FUNCTION public.touch_finance_income_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = clock_timestamp(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS set_income_updated_at ON public.shahar_income;
CREATE TRIGGER set_income_updated_at BEFORE UPDATE ON public.shahar_income
FOR EACH ROW EXECUTE FUNCTION public.touch_finance_income_updated_at();
DROP TRIGGER IF EXISTS set_income_updated_at ON public.kristin_income;
CREATE TRIGGER set_income_updated_at BEFORE UPDATE ON public.kristin_income
FOR EACH ROW EXECUTE FUNCTION public.touch_finance_income_updated_at();


CREATE OR REPLACE VIEW public.family_income WITH (security_invoker = true) AS
SELECT 'shahar'::text AS person,* FROM public.shahar_income WHERE NOT is_deleted
UNION ALL SELECT 'kristin',* FROM public.kristin_income WHERE NOT is_deleted;

CREATE OR REPLACE VIEW public.savings_monthly_summary WITH (security_invoker = true) AS
SELECT s.*,
  s.reported_total - lag(s.reported_total) OVER (ORDER BY s.snapshot_month) AS change,
  s.cash_balance + coalesce((SELECT sum(a.value) FROM public.savings_snapshot_assets a WHERE a.snapshot_month = s.snapshot_month),0) AS component_total
FROM public.savings_monthly_snapshots s;

CREATE OR REPLACE VIEW public.income_monthly_summary WITH (security_invoker = true) AS
WITH base AS (
  SELECT person,date_trunc('month',income_date::timestamp)::date AS income_month,
    sum(amount) FILTER (WHERE payment_method = 'cash') AS cash_amount,
    sum(amount) FILTER (WHERE payment_method = 'bit') AS bit_amount,
    sum(amount) FILTER (WHERE payment_method = 'bank') AS bank_amount
  FROM public.family_income GROUP BY person,date_trunc('month',income_date::timestamp)::date
), effective AS (
  SELECT coalesce(b.person,o.person) AS person,coalesce(b.income_month,o.income_month) AS income_month,
    coalesce(o.cash_amount,b.cash_amount,0) AS cash_amount,coalesce(o.bit_amount,b.bit_amount,0) AS bit_amount,
    coalesce(o.bank_amount,b.bank_amount,0) AS bank_amount,o.person IS NOT NULL AS has_override
  FROM base b FULL JOIN public.income_month_overrides o USING(person,income_month)
)
SELECT *,cash_amount + bit_amount + bank_amount AS total_amount FROM effective;

CREATE OR REPLACE FUNCTION public.set_income_month_totals(
  p_person text,p_month date,p_cash numeric,p_bit numeric,p_bank numeric,p_actor uuid,p_expected timestamptz
) RETURNS public.income_month_overrides LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_existing public.income_month_overrides; v_result public.income_month_overrides;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_person || p_month::text,0));
  SELECT * INTO v_existing FROM public.income_month_overrides WHERE person = p_person AND income_month = p_month;
  IF v_existing.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'MONTH_CONFLICT'; END IF;
  INSERT INTO public.income_month_overrides(person,income_month,cash_amount,bit_amount,bank_amount,updated_by)
  VALUES(p_person,p_month,p_cash,p_bit,p_bank,p_actor)
  ON CONFLICT(person,income_month) DO UPDATE SET cash_amount = EXCLUDED.cash_amount,bit_amount = EXCLUDED.bit_amount,
    bank_amount = EXCLUDED.bank_amount,updated_by = EXCLUDED.updated_by,updated_at = clock_timestamp()
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.set_income_month_totals(text,date,numeric,numeric,numeric,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_income_month_totals(text,date,numeric,numeric,numeric,uuid,timestamptz) TO service_role;

DO $security$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['shahar_income','kristin_income','income_month_overrides','cash_monthly_balances',
    'investment_assets','savings_monthly_snapshots','savings_snapshot_assets','finance_events','finance_settings',
    'retirement_accounts','retirement_reports'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',v_table);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon',v_table);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',v_table);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated',v_table);
    EXECUTE format('DROP POLICY IF EXISTS workspace_read ON public.%I',v_table);
    EXECUTE format('CREATE POLICY workspace_read ON public.%I FOR SELECT TO authenticated USING (public.has_site_access())',v_table);
    EXECUTE format('DROP POLICY IF EXISTS administrator_insert ON public.%I',v_table);
    EXECUTE format('CREATE POLICY administrator_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_site_admin())',v_table);
    EXECUTE format('DROP POLICY IF EXISTS administrator_update ON public.%I',v_table);
    EXECUTE format('CREATE POLICY administrator_update ON public.%I FOR UPDATE TO authenticated USING (public.is_site_admin()) WITH CHECK (public.is_site_admin())',v_table);
    EXECUTE format('DROP POLICY IF EXISTS administrator_delete ON public.%I',v_table);
    EXECUTE format('CREATE POLICY administrator_delete ON public.%I FOR DELETE TO authenticated USING (public.is_site_admin())',v_table);
  END LOOP;
END;
$security$;
REVOKE ALL ON public.family_income,public.savings_monthly_summary,public.income_monthly_summary FROM anon;
GRANT SELECT ON public.family_income,public.savings_monthly_summary,public.income_monthly_summary TO authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
