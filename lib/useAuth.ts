"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from './supabase/client';

interface User { id: string; email: string; username: string }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  // Fetch the auth_users profile (contains the real username for existing users)
  const fetchProfile = useCallback(async (): Promise<User | null> => {
    const res = await fetch('/api/users/me');
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange fires INITIAL_SESSION synchronously from the local cookie
    // (no network round-trip), so isInitializing becomes false almost instantly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        // Unblock the page immediately — don't wait for the profile fetch
        if (mounted) setIsInitializing(false);
      }

      if (session?.user) {
        // Fetch the profile in the background; doesn't delay data loading
        fetchProfile().then(profile => {
          if (!mounted) return;
          setUser(profile ?? { id: session.user!.id, email: session.user!.email ?? '', username: session.user!.email?.split('@')[0] ?? '' });
          if (event !== 'INITIAL_SESSION') setIsInitializing(false);
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  // Session is managed via cookies — same-origin fetch sends them automatically.
  // Middleware validates the cookie and sets x-user-id on every authenticated request.
  const fetchWithAuth = useCallback(async (input: RequestInfo, init: RequestInit = {}) => {
    const res = await fetch(input, init);
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('Not authenticated');
    }
    return res;
  }, []);

  return { user, isInitializing, logout, fetchWithAuth };
}

