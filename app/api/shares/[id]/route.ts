import { NextRequest } from 'next/server';
import supabaseServer from '../../../../supabaseServer';

// DELETE /api/shares/[id] - Remove a share
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    // Verify ownership before deleting (only owner can delete shares they created)
    const { data: existing } = await supabaseServer
      .from('user_shares')
      .select('owner_id')
      .eq('id', id)
      .single();

    if (!existing || existing.owner_id !== userId) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await supabaseServer
      .from('user_shares')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return Response.json({ success: true });
  } catch (e) {
    console.error('DELETE /api/shares/[id] error', e);
    return Response.json({ error: 'Failed to delete share' }, { status: 500 });
  }
}
