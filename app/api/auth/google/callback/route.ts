import type { NextRequest } from 'next/server';
import cookie from 'cookie';

export const runtime = 'nodejs';
import { createUser, findByEmail, findByGoogleId, addRefreshToken } from '../../../../../lib/auth/db.supabase';
import { signAccessToken, signRefreshToken } from '../../../../../lib/auth/jwt';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const OAUTH_STATE_COOKIE = 'google_oauth_state';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return Response.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }
  if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

  // Validate state cookie
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!stateCookie || !returnedState || stateCookie !== returnedState) {
    return Response.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResp.ok) {
      console.error('Google token exchange failed');
      return Response.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const tokenData = await tokenResp.json();
    const googleAccess = tokenData.access_token;
    if (!googleAccess) return Response.json({ error: 'No Google access token' }, { status: 400 });

    // Fetch user info
    const userInfoResp = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${googleAccess}` },
    });
    if (!userInfoResp.ok) {
      return Response.json({ error: 'Failed to fetch Google profile' }, { status: 400 });
    }
    const profile = await userInfoResp.json();
    const email = profile.email;
    const googleId = profile.sub;

    let user = await findByGoogleId(googleId);
    if (!user) user = await findByEmail(email);

    // Clear state cookie always
    const clearState = cookie.serialize(OAUTH_STATE_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    if (!user) {
      // New Google user: redirect to signup with google params (no tokens yet)
      const redirectTo = `${appUrl}/login?mode=signup&googleId=${googleId}&googleEmail=${encodeURIComponent(email)}&googleName=${encodeURIComponent(profile.name || '')}`;
      return new Response(null, { status: 302, headers: { Location: redirectTo, 'Set-Cookie': clearState } });
    }

    // Existing user: issue tokens and redirect to root
    const internalAccess = await signAccessToken({ sub: user.id, email: user.email, username: user.username });
    const internalRefresh = await signRefreshToken({ sub: user.id, email: user.email, username: user.username });
    await addRefreshToken(user.id, internalRefresh, REFRESH_TTL_MS);
    const refreshCookie = cookie.serialize('refresh_token', internalRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TTL_MS / 1000,
    });
    const redirectTo = `${appUrl}/`;
    return new Response(null, { status: 302, headers: { Location: redirectTo, 'Set-Cookie': `${refreshCookie}, ${clearState}` } });
  } catch (e) {
    console.error('Google OAuth callback error', e);
    return Response.json({ error: 'OAuth callback failed' }, { status: 500 });
  }
}
