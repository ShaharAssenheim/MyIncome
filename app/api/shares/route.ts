import { NextRequest } from 'next/server';
import supabaseServer from '../../../supabaseServer';

export const runtime = 'nodejs';

// GET /api/shares - List all shares (who you shared with and who shared with you)
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get users who I shared my data with
    const { data: sharedByMe, error: error1 } = await supabaseServer
      .from('user_shares')
      .select('id, shared_with_email, shared_with_id, can_edit, created_at')
      .eq('owner_id', userId);

    // Get users who shared their data with me
    const { data: sharedWithMe, error: error2 } = await supabaseServer
      .from('user_shares')
      .select('id, owner_id, can_edit, created_at, auth_users!user_shares_owner_id_fkey(username, email)')
      .eq('shared_with_id', userId);

    if (error1 || error2) throw error1 || error2;

    return Response.json({
      sharedByMe: sharedByMe || [],
      sharedWithMe: sharedWithMe || []
    });
  } catch (e) {
    console.error('GET /api/shares error', e);
    return Response.json({ error: 'Failed to fetch shares' }, { status: 500 });
  }
}

// POST /api/shares - Share your data with another user
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, canEdit = true } = body;

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const { data: targetUser } = await supabaseServer
      .from('auth_users')
      .select('id, email')
      .eq('email', email)
      .single();

    // Can't share with yourself
    if (targetUser?.id === userId) {
      return Response.json({ error: 'Cannot share with yourself' }, { status: 400 });
    }

    // Insert share record
    const { data, error } = await supabaseServer
      .from('user_shares')
      .insert({
        owner_id: userId,
        shared_with_email: email,
        shared_with_id: targetUser?.id || null,
        can_edit: canEdit
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return Response.json({ error: 'Already shared with this user' }, { status: 409 });
      }
      throw error;
    }

    return Response.json(data, { status: 201 });
  } catch (e) {
    console.error('POST /api/shares error', e);
    return Response.json({ error: 'Failed to create share' }, { status: 500 });
  }
}
