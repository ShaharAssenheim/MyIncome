import { NextRequest } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '../../../../lib/auth/jwt';
import { requireCsrf, issueCsrfToken } from '../../../../lib/security/csrf';

export const runtime = 'nodejs';
import { validateRefreshToken, addRefreshToken, revokeRefreshToken, findById } from '../../../../lib/auth/db.supabase';
import cookie from 'cookie';

const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const parsed = cookie.parse(cookieHeader);
    const existingRefresh = parsed['refresh_token'];
    if (!existingRefresh) {
      console.error('[refresh] No refresh token in cookies. Cookie header:', cookieHeader);
      return Response.json({ error: 'Missing refresh token' }, { status: 401 });
    }

    // CSRF: Only check if a CSRF token exists in cookies (after first login)
    // The refresh token cookie itself provides CSRF protection (httpOnly + sameSite)
    const csrfHeader = req.headers.get('x-csrf-token');
    const cookieStore = await (await import('next/headers')).cookies();
    const csrfCookie = (await cookieStore).get('csrf_token')?.value;
    
    // If CSRF cookie exists, require matching header
    if (csrfCookie) {
      if (!csrfHeader || csrfHeader !== csrfCookie) {
        console.error('[refresh] CSRF mismatch. Header:', csrfHeader?.substring(0, 10), 'Cookie:', csrfCookie?.substring(0, 10));
        return Response.json({ error: 'Invalid CSRF' }, { status: 403 });
      }
    }

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

    // Issue new CSRF token on refresh
    const csrfToken = await issueCsrfToken();

    return new Response(JSON.stringify({ 
      accessToken,
      csrfToken,
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
