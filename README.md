# Monthly Income App (Next.js)

Track and visualize monthly income across categories (Cash, Bit, Bank Transfer) using **Next.js 14**, **React 18**, **Supabase**, **TailwindCSS**, **Framer Motion**, and **Recharts**.

## 1. Prerequisites

- Node.js 18+
- Supabase project (free tier is fine)

## 2. Environment Variables

Create a `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These must start with `NEXT_PUBLIC_` to be available in the browser.

## 3. Database Setup (Supabase)

Run in Supabase SQL editor:

```sql
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  type text not null check (type in ('CASH','BIT','BANK')),
  date timestamptz not null,
  description text,
  created_at timestamptz not null default now()
);
```

## 4. Install & Run

```bash
npm install
npm run dev      # Start Next.js dev server
npm run build    # Production build (.next/)
npm run start    # Serve production build
```

## 5. Project Structure

```
app/
  layout.tsx        # Root layout
  page.tsx          # Main page (was App.tsx)
  globals.css       # Tailwind base styles
components/         # UI components (client)
supabaseClient.ts   # Supabase client (NEXT_PUBLIC vars)
types.ts            # TypeScript models
constants.tsx       # Category configuration
tailwind.config.js
postcss.config.js
next.config.js
README.md           # This file
```

## 6. Scripts

| Script        | Purpose                      |
|---------------|------------------------------|
| `dev`         | Start dev server with HMR    |
| `build`       | Create production output     |
| `start`       | Serve built app              |

## 7. Adding a Transaction (Flow)

1. Click a category tile.
2. Modal opens with selected category.
3. Enter amount + optional description.
4. Insert to Supabase; append to local state.
5. Derived stats and charts update automatically.

## 8. Deleting a Transaction

1. Click trash icon in list item.
2. Confirm action.
3. Row removed in Supabase then filtered locally.

## 9. Environment Troubleshooting

| Issue | Fix |
|-------|-----|
| Missing config error | Check `.env.local` names and restart dev server |
| Empty charts | Ensure `date` stored properly on insert |
| Wrong totals | Confirm enum values match `IncomeType` |

## 10. Next Improvements

- Extract CRUD logic to `lib/transactions.ts`.
- Add React Query for caching.
- Add authentication (Supabase Auth).
- Unit tests for aggregation logic (Vitest / Jest).
- ESLint + Prettier setup.

## 11. Documentation

See `guide.html` for a richer, styled onboarding guide. Keep it untracked if you prefer (move to `docs/`).

## 12. Licensing / Notes

Internal educational project. No production secrets should be committed.

---

If you migrated from Vite: all former Vite entry files (`index.html`, `index.tsx`, `App.tsx`, `vite.config.ts`) and `dist/` build artifacts have been removed.
