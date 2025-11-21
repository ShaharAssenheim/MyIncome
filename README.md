# Run the App Locally

This repository contains everything you need to run the income tracker locally.

## Run Locally

**Prerequisites:** 
- Node.js
- Supabase project (free tier is fine)

1. Install dependencies:
   `npm install`
2. Create a `.env.local` file (Vite automatically loads it) with:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. In Supabase SQL Editor, create the `transactions` table:
   ```sql
   create table if not exists public.transactions (
     id uuid primary key default gen_random_uuid(),
     amount numeric not null,
     type text not null,
     date timestamptz not null,
     description text,
     created_at timestamptz not null default now()
   );
   ```
4. Start the dev server:
   `npm run dev`
