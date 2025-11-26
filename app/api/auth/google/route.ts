// START Google OAuth: /api/auth/google  (redirect only)
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import cookie from 'cookie';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_STATE_COOKIE = 'google_oauth_state';
const STATE_TTL_SECONDS = 10 * 60; // 10 minutes

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET; // just to assert presence
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return Response.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

  // Generate state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');
  const scopes = ['openid', 'email', 'profile'];
  const authUrl = `${GOOGLE_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&access_type=offline&prompt=consent&state=${state}`;

  const stateCookie = cookie.serialize(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_TTL_SECONDS,
  });

  return new Response(null, { status: 302, headers: { Location: authUrl, 'Set-Cookie': stateCookie } });
}
