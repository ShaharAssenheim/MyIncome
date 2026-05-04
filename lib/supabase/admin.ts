import { createClient } from '@supabase/supabase-js';

// Admin client — uses service role key, never exposed to the browser.
// Safe for server-side API routes only.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export default supabaseAdmin;
