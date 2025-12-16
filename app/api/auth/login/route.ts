import { NextRequest } from 'next/server';
import { findByEmail, addRefreshToken } from '../../../../lib/auth/db.supabase';
import { issueCsrfToken } from '../../../../lib/security/csrf';
import { z } from 'zod';

export const runtime = 'nodejs';
import { verifyPassword } from '../../../../lib/auth/hash';
import { signAccessToken, signRefreshToken } from '../../../../lib/auth/jwt';
import cookie from 'cookie';

const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const EXTENDED_REFRESH_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days if stay logged in

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  stayLoggedIn: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = LoginSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid credentials' }, { status: 400 });
    }
    const { email, password, stayLoggedIn } = parsed.data;
    const user = await findByEmail(email);
    if (!user) return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    
    // Google-only users don't have a password
    if (!user.passwordHash) {
      // Prevent account enumeration by returning generic error
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, username: user.username });
    const refreshToken = await signRefreshToken({ sub: user.id, email: user.email, username: user.username }, stayLoggedIn ? '14d' : '7d');
    const ttl = stayLoggedIn ? EXTENDED_REFRESH_TTL_MS : DEFAULT_REFRESH_TTL_MS;
    await addRefreshToken(user.id, refreshToken, ttl);

    const refreshCookie = cookie.serialize('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ttl / 1000,
    });

    const csrfToken = await issueCsrfToken();
    return new Response(JSON.stringify({ accessToken, csrfToken, user: { id: user.id, email: user.email, username: user.username } }), {
      status: 200,
      headers: { 'Set-Cookie': refreshCookie, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Login error', e);
    return Response.json({ error: 'Server error' }, { status: 500 });
  }
}
