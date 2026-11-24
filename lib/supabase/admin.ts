import { createClient } from '@supabase/supabase-js';

// Admin client — uses service role key, never exposed to the browser.
// Safe for server-side API routes only.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export default supabaseAdmin;

export async function readRows(table: string, orderFields = ["id"], columns = "*", filters: Record<string, string | boolean> = {}) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabaseAdmin.from(table).select(columns);
    for (const [field, value] of Object.entries(filters)) query = query.eq(field, value);
    for (const field of orderFields) query = query.order(field);
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
