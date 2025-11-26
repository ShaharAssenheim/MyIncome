import { NextRequest } from 'next/server';
import supabaseServer from '../../../supabaseServer';

export const runtime = 'nodejs';

// GET /api/transactions - List all transactions for current user and shared users
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all accessible user IDs (own + shared)
    const { data: accessibleUsers } = await supabaseServer
      .from('accessible_users')
      .select('accessible_id')
      .eq('user_id', userId);

    const userIds = accessibleUsers?.map(u => u.accessible_id) || [userId];

    const { data, error } = await supabaseServer
      .from('transactions')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return Response.json(data || []);
  } catch (e) {
    console.error('GET /api/transactions error', e);
    return Response.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

// POST /api/transactions - Create a new transaction
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { amount, type, date, description } = body;

    if (!amount || !type || !date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('transactions')
      .insert({ user_id: userId, amount, type, date, description })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (e) {
    console.error('POST /api/transactions error', e);
    return Response.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
