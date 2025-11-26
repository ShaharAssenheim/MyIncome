// Server-side Supabase client (no "use client").
// Requires SUPABASE_SERVICE_ROLE_KEY (never expose to client) + NEXT_PUBLIC_SUPABASE_URL.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('[supabaseServer] Missing Supabase URL or service role key');
}

export const supabaseServer = createClient(supabaseUrl!, serviceRoleKey!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export default supabaseServer;
