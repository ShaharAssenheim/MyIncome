import { NextRequest } from 'next/server';
import { verifyRefreshToken } from '../../../../lib/auth/jwt';

export const runtime = 'nodejs';
import { revokeRefreshToken } from '../../../../lib/auth/db.supabase';
import cookie from 'cookie';

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const parsed = cookie.parse(cookieHeader);
    const existingRefresh = parsed['refresh_token'];

    if (existingRefresh) {
      const decoded = await verifyRefreshToken(existingRefresh);
      if (decoded) {
        await revokeRefreshToken(decoded.sub, existingRefresh);
      }
    }

    const expiredCookie = cookie.serialize('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Set-Cookie': expiredCookie, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Logout error', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
