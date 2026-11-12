export const SITE_ADMIN_EMAIL = 'shacharassen3667@gmail.com';

export function isSiteAdmin(email?: string | null) {
  return email?.trim().toLowerCase() === SITE_ADMIN_EMAIL;
}

export async function checkSiteAccess(client: any, user: { email?: string; email_confirmed_at?: string } | null) {
  if (!user?.email || !user.email_confirmed_at) return { allowed: false, isAdmin: false };
  if (isSiteAdmin(user.email)) return { allowed: true, isAdmin: true };
  const { data, error } = await client.from('site_allowed_emails').select('email')
    .eq('email', user.email.trim().toLowerCase()).maybeSingle();
  if (error) throw new Error('Could not verify site access');
  return { allowed: Boolean(data), isAdmin: false };
}
