import { NextRequest } from 'next/server';
import supabaseServer from '../../../../lib/supabase/admin';

export const runtime = 'nodejs';

// GET /api/users/me — returns the current user's profile from auth_users
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from('auth_users')
    .select('id, email, username')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Profile not found' }, { status: 404 });
  }

  return Response.json(data);
}
