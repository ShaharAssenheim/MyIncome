# Database

`schema.sql` is the single, complete definition of the current application schema. It contains all 11 public tables, three security-invoker views, indexes, RLS policies, the monthly-edit RPC, and Supabase Auth admission/profile triggers. Supabase provides the `auth` schema and API roles.

| Table | Purpose |
| --- | --- |
| `auth_users` | Application profiles linked to financial records |
| `site_allowed_emails` | Approved viewer emails; managed through the server |
| `shahar_income` | Shahar's income, including explicit work and payment dates |
| `kristin_income` | Kristin's separate income ledger |
| `income_month_overrides` | Explicit monthly cash/Bit/bank totals and edit versions |
| `cash_monthly_balances` | Reported current-account balances and source reference balances |
| `investment_assets` | Asset metadata and current valuations |
| `savings_monthly_snapshots` | Historical cash, reported totals and accuracy status |
| `savings_snapshot_assets` | Nonzero asset balances in each historical snapshot |
| `finance_events` | Dated financial events |
| `finance_settings` | Household owner, schema version, snapshot date, notes and sources |

The views are `family_income`, `income_monthly_summary` and `savings_monthly_summary`. They calculate results from these tables without storing duplicate data. Shahar and Kristin remain separate tables.

## Setup and reapplication

Run `schema.sql` in the SQL editor of a Supabase project before registering application users. The administrator email in the SQL must match `lib/site-access.ts`. Sign-in providers and redirect URLs are Supabase dashboard configuration, separate from the application schema.

The SQL creates structure, not private financial seed data. A new project needs its own income, assets, balances and a `finance_settings` row with `schema_version = 2`. Existing financial exports contain the values to restore into the corresponding tables; `owner_id` and `updated_by` must reference the appropriate profiles/Auth users in the destination project.

Reapplying the SQL to the matching version-2 schema preserves all records, UUIDs, dates and edit versions. It recreates the known functions, policies and triggers, and reloads the PostgREST schema cache. The consolidated definition also explicitly revokes anonymous profile access and direct public execution of Auth trigger functions. It has not been reapplied to the hosted database as part of repository cleanup.

If retired tables exist, the script stops before changing the schema. It is not a replacement for historical data migration or an automatic repair of arbitrary schema drift. The completed migrations remain recorded in the hosted Supabase migration history:

- `20261124131919_normalize_finance`
- `20261124132034_retire_legacy_finance`
- `20261124133029_retire_legacy_access`

Their local one-off SQL, legacy bootstrap SQL and deletion/compaction scripts have been retired. The verified private JSON snapshots and before/after cleanup records remain excluded from Git.

## Data rules

- `income_date` is authoritative for reporting; reading an income row never shifts it from `payment_date`.
- Money uses `numeric(18,2)`. Unsupported payment methods and NaN are rejected.
- Income supports soft deletion and maintained `updated_at` timestamps.
- Monthly overrides replace totals and reject stale edit versions atomically.
- Preserve `reported_total`, including historical one-cent rounding differences. `component_total` is a separate computed value.
- A missing `savings_snapshot_assets` row means zero for that asset/month.
- Cash and investment valuation dates are independent. Do not infer investment value from purchase amounts.
- Approved viewers can read the family workspace. Only the administrator can mutate it through authenticated access. The monthly-edit RPC is service-role-only.

## Verification

`npm run test:db` runs the complete schema on PGlite and verifies fresh installation, data-preserving reapplication, signup/profile triggers, separate income dates, historical rounding, monthly overrides, RLS, admin writes, stale-edit rejection and safe refusal of legacy schemas.

`npm run verify:finance` reads the configured live database using the application's actual data-access functions. Add `-- --backup` to save an exclusive private `db/finance-export-*.local.json` export. Add `-- --baseline <export-path>` to compare every exported financial row against an earlier version-2 export. Neither mode writes to the database.

The previous rollout preserved 87 Shahar entries, 82 Kristin entries, 95 cash months, 95 historical snapshots and 75 nonzero historical asset balances. Cash was ILS 37,321.43 as of 2026-11-23 and investments were ILS 1,000,747.32. The access cleanup retained identical checksums in all 11 surviving tables.
