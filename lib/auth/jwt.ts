import { SignJWT, jwtVerify } from 'jose';

// Access tokens: short-lived (15m). Refresh tokens: long-lived (7-14d).
// Secrets must be provided via environment variables.
const ACCESS_SECRET = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn('[auth] Missing JWT secrets (JWT_ACCESS_SECRET / JWT_REFRESH_SECRET).');
}

export interface JwtPayload {
  sub: string; // user id
  email: string;
  username?: string;
  type?: 'access' | 'refresh';
  [key: string]: any;
}

export async function signAccessToken(payload: Omit<JwtPayload, 'type'>, expiresIn: string = '15m') {
  return await new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(payload: Omit<JwtPayload, 'type'>, expiresIn: string = '7d') {
  return await new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    if (payload.type !== 'access') return null;
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (payload.type !== 'refresh') return null;
    return payload as unknown as JwtPayload;
  } catch (e) {
    console.error('[verifyRefreshToken] failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
