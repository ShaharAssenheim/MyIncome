import { createClient } from '../../../../lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return Response.json({ authenticated: false, error: error?.message ?? 'No session' });
  }

  return Response.json({
    authenticated: true,
    user: { id: user.id, email: user.email },
  });
}

