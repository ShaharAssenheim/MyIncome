# Supabase migration

Run **finance-migration.local.sql** in the existing MyIncome Supabase project.

1. Open SQL Editor and create a new query.
2. Paste the entire SQL file and click Run.
3. Refresh MyIncome after the query succeeds.

The file contains the application schema, finance tables, access policies, import function, both original savings JSON datasets, and all nine parsed bank statements. Data is assigned to the existing Shahar profile identified in the script.

The `person` field separates manual income for Kristin and Shahar. Existing income records default to Kristin. Shahar's payroll is displayed as bank-transfer income in the month of receipt.

Payroll now has a dedicated `shahar_salaries` table with payment date, generated year and month, amount, employer when identified, and a unique link to the bank transaction. The migration backfills existing payroll. A trigger captures future salary imports. Re-imports preserve edited or soft-deleted salary records.

On either income page, choose a month and use the administrator's monthly edit button to set the cash, Bit, and bank-transfer totals. `monthly_income_overrides` stores those totals and the editing administrator. The original receipts remain available, with an adjustment entry explaining the difference. New imports preserve an explicitly edited month's totals. Concurrent saves require the latest version and return a conflict instead of overwriting another edit.

`bank_yearly_summary` and `bank_monthly_closing` provide compact bank aggregates. The overview streams initial server data and loads transaction details in pages of 50. Shared financial data has a 30-second server cache, and income/import changes invalidate the server cache and browser data. Admission checks remain live on protected requests.

Only the verified email `shacharassen3667@gmail.com` is the site administrator. The administrator manages approved login emails through the main menu. The migration adds `site_allowed_emails`, blocks unapproved new signups, and applies restrictive access policies to existing application tables. Existing users and financial records are preserved. Other existing emails require explicit approval to regain access.

Approved emails can view the full shared financial workspace, including both income pages and bank and savings data. Only the administrator can add, import, edit, or delete data. The main menu provides one access-management control. Revoking login approval blocks subsequent requests even when a user still has a Supabase session.

The migration executes in a single atomic `DO` statement and verifies expected bank records before committing. This keeps temporary verification tables in the same transaction and session. Repeated runs preserve existing datasets and skip duplicate transactions.

Before applying changes, it snapshots existing records in the application, finance, and approved-email tables. It verifies that every existing row is still present with its original values before committing. Any mismatch rolls back the entire migration.

For the supplied data, the final query returns 2 datasets, 9 statement files, 1,519 unique bank transactions, and 85 salary payments. Counts can be higher if additional records have already been imported.

The SQL file contains personal financial data and is excluded from Git by the db/*.local.sql rule.
