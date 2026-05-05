"use client";
import React, { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { createClient } from '../../lib/supabase/client';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get('next') || '/';

  const supabase = useMemo(() => createClient(), []);

  function getSafeNextTarget() {
    if (!nextTarget.startsWith('/') || nextTarget.startsWith('//')) return '/';
    return nextTarget;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(getSafeNextTarget());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
      if (data.session) {
        router.replace(getSafeNextTarget());
        router.refresh();
      } else {
        setSuccessMsg('נשלח מייל לאימות. בדוק את תיבת הדואר שלך.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);

    try {
      // NEXT_PUBLIC_SITE_URL should be set in Vercel env vars to the production URL.
      // Falls back to the current origin for local dev.
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || window.location.origin;
      const callbackUrl = new URL('/api/auth/callback', siteUrl);
      callbackUrl.searchParams.set('next', getSafeNextTarget());

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : 'Google login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eaecf8] py-12 px-4" dir="rtl">
      <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-lg">
        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-3xl font-bold text-slate-800 mb-1">
            {mode === 'login' ? 'ברוכים הבאים' : 'יצירת חשבון'}
          </h1>
          <p className="text-sm text-slate-400">
            {mode === 'login' ? 'התחברו כדי לנהל את ההכנסות וההוצאות' : 'הצטרפו כדי לנהל את ההכנסות וההוצאות'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 text-sm rounded-xl bg-rose-50 text-rose-600 text-center">
            {error}
          </div>
        )}

        {successMsg ? (
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm text-center">
            {successMsg}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google button */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <span>התחבר עם Google</span>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">או</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right placeholder:text-slate-400 text-slate-700"
                  placeholder="כתובת אימייל"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right placeholder:text-slate-400 text-slate-700"
                  placeholder="סיסמה (לפחות 6 תווים)"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-semibold transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'ממשיך...' : 'כניסה'}
                </button>
                <p className="text-sm text-slate-500 text-center pt-1">
                  אין לך חשבון?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="text-slate-500 hover:text-indigo-600 underline underline-offset-2">
                    הירשם כאן
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right placeholder:text-slate-400 text-slate-700"
                  placeholder="כתובת אימייל"
                />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right placeholder:text-slate-400 text-slate-700"
                  placeholder="שם משתמש"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-right placeholder:text-slate-400 text-slate-700"
                  placeholder="סיסמה (לפחות 6 תווים)"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-semibold transition-colors disabled:opacity-50 mt-1"
                >
                  {loading ? 'יוצר...' : 'צור חשבון'}
                </button>
                <p className="text-sm text-slate-500 text-center pt-1">
                  כבר יש לך חשבון?{' '}
                  <button type="button" onClick={() => setMode('login')} className="text-slate-500 hover:text-indigo-600 underline underline-offset-2">
                    התחבר כאן
                  </button>
                </p>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md p-8">
          <div className="bg-white p-8 rounded-3xl shadow-md border border-slate-100">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto"></div>
              <div className="h-12 bg-slate-100 rounded"></div>
              <div className="h-12 bg-slate-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

