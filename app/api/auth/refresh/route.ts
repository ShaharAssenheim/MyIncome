import { NextRequest } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../../../../lib/auth/jwt';

export const runtime = 'nodejs';
import { validateRefreshToken, addRefreshToken, revokeRefreshToken, findById } from '../../../../lib/auth/db.supabase';
import cookie from 'cookie';

const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const parsed = cookie.parse(cookieHeader);
    const existingRefresh = parsed['refresh_token'];
    if (!existingRefresh) return Response.json({ error: 'Missing refresh token' }, { status: 401 });

    const decoded = await verifyRefreshToken(existingRefresh);
    if (!decoded) return Response.json({ error: 'Invalid refresh token' }, { status: 401 });

    const userId = decoded.sub;
    const valid = await validateRefreshToken(userId, existingRefresh);
    if (!valid) return Response.json({ error: 'Refresh token revoked or expired' }, { status: 401 });

    const user = await findById(userId);
    if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

    // Rotate refresh token
    await revokeRefreshToken(userId, existingRefresh);
    const newRefresh = await signRefreshToken({ sub: user.id, email: user.email, username: user.username });
    await addRefreshToken(user.id, newRefresh, DEFAULT_REFRESH_TTL_MS);

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, username: user.username });

    const refreshCookie = cookie.serialize('refresh_token', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DEFAULT_REFRESH_TTL_MS / 1000,
    });

    return new Response(JSON.stringify({ 
      accessToken,
      user: { id: user.id, email: user.email, username: user.username }
    }), {
      status: 200,
      headers: { 'Set-Cookie': refreshCookie, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Refresh error', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
