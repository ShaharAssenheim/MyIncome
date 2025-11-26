import { NextRequest } from 'next/server';
import { createUser, findByEmail, addRefreshToken } from '../../../../lib/auth/db.supabase';

export const runtime = 'nodejs';
import { hashPassword } from '../../../../lib/auth/hash';
import { signAccessToken, signRefreshToken } from '../../../../lib/auth/jwt';
import cookie from 'cookie';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, username, password } = body;
    if (!email || !username || !password) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
      return Response.json({ error: 'Invalid field types' }, { status: 400 });
    }
    const existing = await findByEmail(email);
    if (existing) {
      return Response.json({ error: 'Email already in use' }, { status: 409 });
    }
    const passwordHash = await hashPassword(password);
    const user = await createUser(email, username, passwordHash);
    const accessToken = await signAccessToken({ sub: user.id, email: user.email, username: user.username });
    const refreshToken = await signRefreshToken({ sub: user.id, email: user.email, username: user.username });
    await addRefreshToken(user.id, refreshToken, REFRESH_TTL_MS);

    const refreshCookie = cookie.serialize('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TTL_MS / 1000,
    });

    return new Response(JSON.stringify({ accessToken, user: { id: user.id, email: user.email, username: user.username } }), {
      status: 201,
      headers: { 'Set-Cookie': refreshCookie, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('Register error', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
