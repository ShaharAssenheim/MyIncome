import { NextRequest } from 'next/server';
import supabaseServer from '../../../../supabaseServer';

export const runtime = 'nodejs';

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await req.json();
    const { amount, type, date, description } = body;

    // Verify ownership before updating
    const { data: existing } = await supabaseServer
      .from('transactions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { data, error } = await supabaseServer
      .from('transactions')
      .update({ amount, type, date, description })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (e) {
    console.error('PUT /api/transactions/[id] error', e);
    return Response.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    // Verify ownership before deleting
    const { data: existing } = await supabaseServer
      .from('transactions')
      .select('user_id')
      .eq('id', id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await supabaseServer
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/transactions/[id] error', e);
    return Response.json({ error: 'Failed to delete transaction' }, { status: 500 });
  }
}
