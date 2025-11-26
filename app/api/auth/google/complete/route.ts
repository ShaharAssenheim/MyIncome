import { NextRequest } from 'next/server';
import cookie from 'cookie';

export const runtime = 'nodejs';
import { createUser, findByEmail, findByGoogleId, addRefreshToken } from '../../../../../lib/auth/db.supabase';
import { signAccessToken, signRefreshToken } from '../../../../../lib/auth/jwt';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { googleId, email, username } = body || {};
    if (!googleId || !email || !username) {
      return Response.json({ error: 'Missing googleId, email or username' }, { status: 400 });
    }

    const existingByGoogle = await findByGoogleId(googleId);
    if (existingByGoogle) {
      return Response.json({ error: 'Account already exists. Please login.' }, { status: 409 });
    }
    const existingByEmail = await findByEmail(email);
    if (existingByEmail) {
      return Response.json({ error: 'Email already registered. Try password login.' }, { status: 409 });
    }

    const user = await createUser(email, username, 'oauth-google', googleId);
    const access = await signAccessToken({ sub: user.id, email: user.email, username: user.username });
    const refresh = await signRefreshToken({ sub: user.id, email: user.email, username: user.username });
    await addRefreshToken(user.id, refresh, REFRESH_TTL_MS);

    const refreshCookie = cookie.serialize('refresh_token', refresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TTL_MS / 1000,
    });

    return Response.json({ accessToken: access, user: { id: user.id, email: user.email, username: user.username } }, {
      status: 201,
      headers: { 'Set-Cookie': refreshCookie }
    });
  } catch (e) {
    console.error('[google complete] error', e);
    return Response.json({ error: 'Google signup failed' }, { status: 500 });
  }
}
