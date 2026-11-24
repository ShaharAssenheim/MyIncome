const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const schema = readFileSync(resolve(__dirname, "../db/schema.sql"), "utf8");
const owner = "11111111-1111-4111-8111-111111111111";
const viewer = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";

async function supabaseDatabase() {
  const db = new PGlite();
  // Supabase supplies these objects; the application SQL must not recreate them.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,
      raw_user_meta_data jsonb NOT NULL DEFAULT '{}',raw_app_meta_data jsonb NOT NULL DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid; $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
  `);
  return db;
}

async function claims(db, id, role = "authenticated") {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: id, role })]);
  await db.exec(`SET ROLE ${role}`);
}

async function contents(db) {
  const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  return Promise.all(tables.map(async ({ tablename }) => ({ table: tablename,
    rows: (await db.query(`SELECT to_jsonb(t) AS row FROM public.${tablename} t ORDER BY to_jsonb(t)::text`)).rows,
  })));
}

test("complete schema creates the current workspace and preserves data and permissions on rerun", async (t) => {
  const db = await supabaseDatabase();
  try {
    await db.exec(schema);
    await db.exec(`
      INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${owner}','shacharassen3667@gmail.com',now());
      INSERT INTO public.site_allowed_emails VALUES('viewer@example.test','${owner}',now());
      INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data)
        VALUES('${viewer}','viewer@example.test',now(),' {"full_name":"Approved Viewer","role":"admin"}');
      INSERT INTO public.shahar_income(id,owner_id,income_date,payment_date,amount,payment_method,is_salary)
        VALUES('${owner}','${owner}','2026-09-01','2026-10-05',1234.56,'bank',true);
      INSERT INTO public.kristin_income(id,owner_id,income_date,amount,payment_method)
        VALUES('${viewer}','${owner}','2026-09-10',50,'cash');
      INSERT INTO public.finance_settings(id,owner_id,snapshot_date,profit_shown_in_portfolio,notes,sources)
        VALUES(1,'${owner}','2026-09-30',10,ARRAY['historical estimate'],ARRAY['report.pdf']);
      INSERT INTO public.cash_monthly_balances VALUES('2026-09-01','2026-09-30',100,99);
      INSERT INTO public.investment_assets(asset_key,name,asset_type,display_color,current_value,valuation_date)
        VALUES('fund','Fund','money_market','#55c1b2',500.25,'2026-09-29');
      INSERT INTO public.savings_monthly_snapshots VALUES
        ('2026-08-01','2026-08-31',100,300.01,'estimate'),('2026-09-01','2026-09-30',100,400.03,'mixed_dates');
      INSERT INTO public.savings_snapshot_assets VALUES('2026-08-01','fund',200.02),('2026-09-01','fund',300.03);
      INSERT INTO public.finance_events(event_date,category,title,amount,description,display_order)
        VALUES('2026-09-30','balance','Balance',100,'Original report',1);
      INSERT INTO public.income_month_overrides(person,income_month,cash_amount,bit_amount,bank_amount,updated_by)
        VALUES('shahar','2026-06-01',0,0,800,'${owner}');
    `);
    await t.test("11 RLS tables, three invoker views and separate income ledgers exist", async () => {
      assert.equal((await db.query("SELECT count(*) AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n, 11);
      assert.equal((await db.query("SELECT count(*) AS n FROM pg_views WHERE schemaname='public'")).rows[0].n, 3);
      assert.equal((await db.query("SELECT bool_and(relrowsecurity) AS ok FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r'")).rows[0].ok, true);
      assert.equal((await db.query("SELECT bool_and(reloptions @> ARRAY['security_invoker=true']) AS ok FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='v'")).rows[0].ok, true);
      const before = await contents(db);
      await db.exec(schema);
      assert.deepEqual(await contents(db), before);
      assert.equal((await db.query("SELECT count(*) AS n FROM public.family_income")).rows[0].n, 2);
    });
    await t.test("signup trigger maintains profiles and rejects unapproved new accounts", async () => {
      assert.equal((await db.query("SELECT username FROM public.auth_users WHERE id=$1", [viewer])).rows[0].username, "Approved Viewer");
      await assert.rejects(db.query("INSERT INTO auth.users(id,email) VALUES($1,'outsider@example.test')", [outsider]), /not approved/);
      assert.equal((await db.query("SELECT count(*) AS n FROM public.auth_users")).rows[0].n, 2);
    });
    await t.test("income dates, original totals, rounding and empty-month edits remain intact", async () => {
      const salary = (await db.query("SELECT income_date::text,payment_date::text FROM public.shahar_income")).rows[0];
      assert.deepEqual(salary, { income_date: "2026-09-01", payment_date: "2026-10-05" });
      const snapshot = (await db.query("SELECT reported_total,component_total FROM public.savings_monthly_summary ORDER BY snapshot_month")).rows[0];
      assert.equal(Number(snapshot.reported_total), 300.01);
      assert.equal(Number(snapshot.component_total), 300.02);
      const edited = (await db.query("SELECT total_amount,has_override FROM public.income_monthly_summary WHERE income_month='2026-06-01'")).rows[0];
      assert.equal(Number(edited.total_amount), 800); assert.equal(edited.has_override, true);
    });
    await t.test("approved viewers can read finances and only their own profile, but cannot write", async () => {
      await claims(db, viewer);
      assert.equal((await db.query("SELECT count(*) AS n FROM public.family_income")).rows[0].n, 2);
      assert.deepEqual((await db.query("SELECT id FROM public.auth_users")).rows, [{ id: viewer }]);
      await assert.rejects(db.query(`INSERT INTO public.kristin_income(owner_id,income_date,amount,payment_method) VALUES('${viewer}','2026-09-01',1,'cash')`), /row-level security/);
      assert.equal((await db.query("UPDATE public.auth_users SET username='changed' RETURNING id")).rows.length, 0);
      await assert.rejects(db.query(`SELECT public.set_income_month_totals('kristin','2026-09-01',1,0,0,'${viewer}',NULL)`), /permission denied/);
      await db.exec("RESET ROLE");
    });
    await t.test("unapproved and anonymous access is blocked", async () => {
      await claims(db, outsider);
      assert.equal((await db.query("SELECT * FROM public.family_income")).rows.length, 0);
      assert.equal((await db.query("SELECT * FROM public.auth_users")).rows.length, 0);
      await claims(db, owner, "anon");
      await assert.rejects(db.query("SELECT * FROM public.family_income"), /permission denied/);
      await assert.rejects(db.query("SELECT * FROM public.auth_users"), /permission denied/);
      await assert.rejects(db.query("SELECT public.handle_new_supabase_user()"), /permission denied/);
      await db.exec("RESET ROLE");
    });
    await t.test("admin edits work, invalid data fails and deleted income is excluded", async () => {
      await claims(db, owner);
      assert.equal((await db.query("SELECT * FROM public.auth_users")).rows.length, 2);
      await db.exec("BEGIN");
      const changed = await db.query("UPDATE public.shahar_income SET is_deleted=true RETURNING updated_at > created_at AS touched");
      assert.equal(changed.rows[0].touched, true);
      assert.equal((await db.query("SELECT * FROM public.family_income")).rows.length, 1);
      await db.exec("ROLLBACK");
      await assert.rejects(db.query(`INSERT INTO public.kristin_income(owner_id,income_date,amount,payment_method) VALUES('${owner}','2026-09-01','NaN','cash')`), /check constraint/);
      await assert.rejects(db.query(`INSERT INTO public.kristin_income(owner_id,income_date,amount,payment_method) VALUES('${owner}','2026-09-01',1,'invalid')`), /check constraint/);
      await db.exec("RESET ROLE");
    });
    await t.test("monthly edits are atomic and stale versions cannot overwrite later edits", async () => {
      await db.exec("SET ROLE service_role");
      const first = (await db.query("SELECT * FROM public.set_income_month_totals('kristin','2026-09-01',100,20,30,$1,NULL)", [owner])).rows[0];
      await assert.rejects(db.query("SELECT * FROM public.set_income_month_totals('kristin','2026-09-01',1,2,3,$1,NULL)", [owner]), /MONTH_CONFLICT/);
      const next = (await db.query("SELECT * FROM public.set_income_month_totals('kristin','2026-09-01',200,20,30,$1,$2)", [owner, first.updated_at])).rows[0];
      assert.equal(Number(next.cash_amount), 200);
      await db.exec("RESET ROLE");
    });
    await t.test("legacy tables stop schema setup before any data or policies can change", async () => {
      const before = await contents(db);
      await db.exec("CREATE TABLE public.transactions(id integer); INSERT INTO public.transactions VALUES(1)");
      await assert.rejects(db.exec(schema), /Legacy table transactions still exists/);
      await db.exec("ROLLBACK");
      assert.equal((await db.query("SELECT id FROM public.transactions")).rows[0].id, 1);
      await db.exec("DROP TABLE public.transactions");
      assert.deepEqual(await contents(db), before);
    });
  } finally { await db.close(); }
});
