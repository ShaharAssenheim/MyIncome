import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE = 'csrf_token';

export async function issueCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1h
  });
  return token;
}

export async function verifyCsrf(headerToken: string | null): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  return Boolean(headerToken && cookieToken && headerToken === cookieToken);
}

export async function requireCsrf(headerToken: string | null) {
  const valid = await verifyCsrf(headerToken);
  if (!valid) {
    throw new Error('Invalid CSRF token');
  }
}