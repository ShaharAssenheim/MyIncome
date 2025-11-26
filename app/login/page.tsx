"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SiGoogle } from 'react-icons/si';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

interface LoginResponse {
  accessToken: string;
  user: { id: string; email: string; username: string };
  error?: string;
}

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get('next') || '/';
  const googleIdParam = searchParams.get('googleId');
  const googleEmailParam = searchParams.get('googleEmail');
  const googleNameParam = searchParams.get('googleName');

  // If coming from Google new user flow force signup mode
  useEffect(() => {
    if (googleIdParam && googleEmailParam) {
      setMode('signup');
      setEmail(googleEmailParam);
      if (googleNameParam) setUsername(googleNameParam);
    }
  }, [googleIdParam, googleEmailParam, googleNameParam]);
  async function handleGoogleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!googleIdParam || !email || !username) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleId: googleIdParam, email, username }),
      });
      const data: LoginResponse = await res.json();
      if (!res.ok) {
        setError(data.error || 'Google signup failed');
      } else {
        setAccessToken(data.accessToken);
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, stayLoggedIn }),
      });
      const data: LoginResponse = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
      } else {
        setAccessToken(data.accessToken);
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data: LoginResponse = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
      } else {
        setAccessToken(data.accessToken);
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    window.location.href = '/api/auth/google';
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAccessToken(null);
  }

  // After acquiring an access token (and refresh cookie already set), redirect to requested page
  useEffect(() => {
    if (accessToken) {
      const nextTargetNormalized = nextTarget.startsWith('/') ? nextTarget : `/${nextTarget}`;
      window.location.href = nextTargetNormalized;
    }
  }, [accessToken, nextTarget]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl shadow-md border border-slate-100">
        <h1 className="text-3xl font-bold text-slate-800 text-center">Welcome to MyIncome</h1>
        {error && (
          <div className="p-3 text-sm rounded-xl bg-rose-100 text-rose-700 text-center font-medium">
            {error}
          </div>
        )}
        {accessToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm text-center">
              Signing you in...
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!googleIdParam && (
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 flex items-center justify-center gap-2"
              >
                <SiGoogle className="text-[#4285F4]" size={18} />
                <span className="inline-block">{mode === 'signup' ? 'Sign up with Google' : 'Log in with Google'}</span>
              </button>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">OR</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {mode === 'login' && !googleIdParam ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-600">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Enter your email address"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-600">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stayLoggedIn}
                      onChange={e => setStayLoggedIn(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Stay logged in for 7 days
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Continue…' : 'Continue'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setMode('signup')} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Sign up
                  </button>
                </p>
              </form>
            ) : googleIdParam ? (
              <form onSubmit={handleGoogleSignup} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Google Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-slate-600">Username</label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Choose a username"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Finish Google Sign Up'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Log in
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-slate-600">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Enter your email address"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-slate-600">Username</label>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Choose a username"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-slate-600">Password</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    placeholder="Create a strong password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create account'}
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setMode('login')} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Log in
                  </button>
                </p>
              </form>
            )}
          </div>
        )}
        {!accessToken && (
          <p className="text-xs text-slate-400 text-center">
            Passwords are hashed (bcrypt). Refresh token stored HttpOnly cookie.
          </p>
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
      <LoginPageContent />
    </Suspense>
  );
}
