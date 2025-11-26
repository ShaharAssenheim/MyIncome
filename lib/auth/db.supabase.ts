import supabaseServer from '../../supabaseServer';
import { hashToken, verifyToken } from './hash';

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  googleId?: string;
}

// USERS
export async function findByEmail(email: string): Promise<UserRecord | undefined> {
  const { data, error } = await supabaseServer
    .from('auth_users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapUser(data);
}

export async function findByGoogleId(googleId: string): Promise<UserRecord | undefined> {
  const { data, error } = await supabaseServer
    .from('auth_users')
    .select('*')
    .eq('google_id', googleId)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapUser(data);
}

export async function findById(id: string): Promise<UserRecord | undefined> {
  const { data, error } = await supabaseServer
    .from('auth_users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapUser(data);
}

export async function createUser(email: string, username: string, passwordHash: string, googleId?: string): Promise<UserRecord> {
  const { data, error } = await supabaseServer
    .from('auth_users')
    .insert({ email, username, password_hash: passwordHash, google_id: googleId })
    .select()
    .single();
  if (error || !data) throw new Error('Failed to create user');
  return mapUser(data);
}

function mapUser(row: any): UserRecord {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    googleId: row.google_id || undefined,
  };
}

// REFRESH TOKENS
export async function addRefreshToken(userId: string, rawToken: string, ttlMs: number): Promise<void> {
  // Purge expired tokens on login/refresh to keep table clean, but don't block login if it fails
  try { await purgeExpiredTokens(); } catch (e) { console.error('Purge failed', e); }

  const hash = await hashToken(rawToken);
  const now = Date.now();
  const expiryTimestamp = now + ttlMs;
  const expiresAt = new Date(expiryTimestamp).toISOString();
  console.log('[addRefreshToken] now:', new Date(now).toISOString(), 'ttlMs:', ttlMs, 'expires:', expiresAt);
  const { data, error } = await supabaseServer
    .from('auth_refresh_tokens')
    .insert({ user_id: userId, token_hash: hash, expires_at: expiresAt })
    .select();
  if (error) {
    console.error('[addRefreshToken] failed', error);
    throw new Error('Failed to persist refresh token');
  }
  console.log('[addRefreshToken] DB stored:', data);
}

export async function revokeRefreshToken(userId: string, rawToken: string): Promise<void> {
  const { data } = await supabaseServer
    .from('auth_refresh_tokens')
    .select('id, token_hash')
    .eq('user_id', userId);
  if (!data) return;
  for (const rt of data) {
    if (await verifyToken(rawToken, rt.token_hash)) {
      await supabaseServer.from('auth_refresh_tokens').delete().eq('id', rt.id);
      break;
    }
  }
}

export async function purgeExpiredTokens(): Promise<void> {
  const nowIso = new Date().toISOString();
  await supabaseServer.from('auth_refresh_tokens').delete().lt('expires_at', nowIso);
}

export async function validateRefreshToken(userId: string, rawToken: string): Promise<boolean> {
  // Don't purge here to avoid slowing down every request in middleware
  const { data } = await supabaseServer
    .from('auth_refresh_tokens')
    .select('token_hash')
    .eq('user_id', userId);
  if (!data) return false;
  for (const rt of data) {
    if (await verifyToken(rawToken, rt.token_hash)) return true;
  }
  return false;
}
