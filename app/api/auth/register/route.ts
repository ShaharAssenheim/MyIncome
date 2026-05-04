import { NextRequest } from 'next/server';
import { createUser, findByEmail, addRefreshToken } from '../../../../lib/auth/db.supabase';
import { issueCsrfToken } from '../../../../lib/security/csrf';
import { z } from 'zod';

export const runtime = 'nodejs';
import { hashPassword } from '../../../../lib/auth/hash';
import { signAccessToken, signRefreshToken } from '../../../../lib/auth/jwt';
import cookie from 'cookie';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(40),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = RegisterSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid fields' }, { status: 400 });
    }
    const { email, username, password } = parsed.data;
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

    const csrfToken = await issueCsrfToken();
    return new Response(JSON.stringify({ accessToken, csrfToken, user: { id: user.id, email: user.email, username: user.username } }), {
      status: 201,
      headers: { 'Set-Cookie': refreshCookie, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('Register error', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
