import { NextRequest } from 'next/server';
import supabaseServer from '../../../supabaseServer';

// GET /api/users - List all users (for sharing purposes)
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users except the current user
    const { data, error } = await supabaseServer
      .from('auth_users')
      .select('id, username, email')
      .neq('id', userId)
      .order('username', { ascending: true });

    if (error) throw error;

    // Get existing shares to mark which users are already shared with
    const { data: shares } = await supabaseServer
      .from('user_shares')
      .select('shared_with_email')
      .eq('owner_id', userId);

    const sharedEmails = new Set(shares?.map(s => s.shared_with_email) || []);

    // Add isShared flag to each user
    const usersWithStatus = (data || []).map(user => ({
      ...user,
      isShared: sharedEmails.has(user.email)
    }));

    return Response.json({ users: usersWithStatus });
  } catch (e) {
    console.error('GET /api/users error', e);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
