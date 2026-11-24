# MyIncome

A Hebrew, RTL family finance application built with Next.js 14, React 18, TypeScript, Tailwind CSS 4 and Supabase.

The overview shows family savings, investment holdings and income trends. Shahar and Kristin have separate income pages and database tables. Administrators can edit income and monthly totals; approved viewers have read access. Supabase Auth manages email/password and Google sign-in, sessions and refresh tokens.

## Local development

Requires Node.js 20+ and npm 9+.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
# Optional: explicit public origin for production OAuth callbacks.
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Run `db/schema.sql` in the Supabase SQL editor to create the complete application schema. See [database setup](db/README.md) for existing-project precautions and the financial data format.

Enable the desired sign-in providers in Supabase Auth. For Google, configure its credentials in the Supabase dashboard. Add `http://localhost:3000/api/auth/callback` and the production equivalent to Supabase's redirect URL allowlist. The application does not use custom JWT secrets or store refresh tokens in public tables.

```sh
npm run dev
```

Open http://localhost:3000. The administrator email is defined in `lib/site-access.ts` and the SQL admission helpers; keep them consistent when adapting the project. Additional viewers must be approved through the account menu before registering.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development |
| `npm run type-check` | Check TypeScript |
| `npm test` | Run all regression tests |
| `npm run test:db` | Rehearse the complete SQL on in-memory PostgreSQL |
| `npm run test:income` | Check income calculations |
| `npm run test:finance` | Check family balance calculations |
| `npm run test:bank` | Check PDF parsing |
| `npm run test:pwa` | Check installation and offline behavior |
| `npm run verify:finance` | Read-only checks against the configured live database |
| `npm run build` | Build the production application |
| `npm start` | Serve the production build |

## Structure

```text
app/                         Pages, protected API routes and global styles
components/                  Finance/income views and shared UI components
lib/finance-server.ts        Family overview and financial export
lib/income-server.ts         Income reads and record lookup
lib/finance-records.ts       Pure database-to-overview conversion
lib/income.ts                Income types, conversion and calculations
lib/supabase/                Browser/server clients and paginated database reads
lib/bank/parse-statement.mjs  PDF parsers; no database writes
db/schema.sql                Complete current application schema
scripts/                     Read-only verification and PDF extraction
tests/                       SQL, API, financial calculation, parser and PWA tests
```

The current application uses normalized schema version 2 directly. Completed migration fallbacks, old table-cleanup utilities, disabled bank-import routes and the diagnostic session endpoint have been removed.

## Financial reports and backups

Automatic PDF uploads and complete bank-transaction storage are disabled. To extract salary receipts and monthly closing balances for review:

```sh
node scripts/extract-current-account.mjs path/to/report.pdf
```

This command has no database connection. Updates must preserve the independent income/payment dates and cash/investment valuation dates. A purchase amount does not establish a new investment valuation.

Export the financial records through the overview's export action, or save a private local export and compare it later:

```sh
npm run verify:finance -- --backup
npm run verify:finance -- --baseline db/finance-export-EXAMPLE.local.json
```

Both commands only read the live database. Local financial snapshots, backup metadata and environment files are excluded from Git. Private snapshots from the completed migrations are retained.

## Install as an application

Serve over HTTPS or localhost and choose **התקנת האפליקציה** in the account menu or login screen. Chrome/Edge can show a native installation prompt. On iPhone/iPad use Share → Add to Home Screen; in macOS Safari use File → Add to Dock.

Launch the installed icon for a standalone window. The service worker caches only the generic offline screen; financial pages, API responses and authentication requests continue to use the network.

## Deployment

Configure the environment variables and Supabase redirect URLs for the deployment, then run `npm run type-check`, `npm test` and `npm run build`. The service-role key belongs only in the server environment. Middleware validates the Supabase session and overwrites identity headers; database RLS enforces admission and administrator permissions.
