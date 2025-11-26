import { NextRequest } from 'next/server';
import { verifyRefreshToken } from '../../../../lib/auth/jwt';

export const runtime = 'nodejs';
import { validateRefreshToken } from '../../../../lib/auth/db.supabase';

export async function GET(req: NextRequest) {
  const refresh = req.cookies.get('refresh_token')?.value;
  if (!refresh) {
    return Response.json({ hasCookie: false }, { status: 200 });
  }
  const decoded = await verifyRefreshToken(refresh);
  let dbValid: boolean | null = null;
  if (decoded) {
    try {
      dbValid = await validateRefreshToken(decoded.sub, refresh);
    } catch (e) {
      console.error('[debug/session] DB validation error', e);
      dbValid = null;
    }
  }
  return Response.json({
    hasCookie: true,
    decoded: decoded ? { sub: decoded.sub, email: decoded.email, exp: decoded['exp'] } : null,
    dbValid,
  }, { status: 200 });
}
