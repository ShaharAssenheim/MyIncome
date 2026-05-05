# Database Setup

All database objects live in a single file: **`schema.sql`**.

## Setup

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard) for your project.
2. Paste the entire contents of `schema.sql` and run it.
3. Done — all tables, indexes, views, the Auth trigger, and RLS policies are created.

Every statement uses `IF NOT EXISTS` / `CREATE OR REPLACE` / `DROP … IF EXISTS`, so the file is safe to re-run at any time without data loss.

## What's included

| Object | Description |
|---|---|
| `auth_users` | Application profile — one row per user, `id` mirrors `auth.users.id` |
| `auth_refresh_tokens` | Legacy token table, kept for data compatibility |
| `transactions` | Income records (type: `cash` / `bit` / `bank`) |
| `user_shares` | Tracks which users share their data with others |
| `accessible_users` | View: all user IDs a given user may read |
| `handle_new_supabase_user` | Trigger: auto-creates a profile for every new Supabase Auth signup (email & Google) |
| RLS policies | Row-level security on all three tables |

## Migration from custom-auth

If you are migrating an existing deployment that used its own JWT/bcrypt auth, uncomment **section 8** at the bottom of `schema.sql` and run it once to import existing users into Supabase Auth.
