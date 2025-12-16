"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

interface User { id: string; email: string; username: string }
interface LoginResult { accessToken: string; user: User; csrfToken: string }

// Helper to get CSRF token from cookie
function getCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// Simple client auth hook that stores access token in memory only (not localStorage) for security.
// Automatically attempts refresh on 401 responses when using fetchWithAuth.
export function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const isRefreshing = useRef(false);

  const login = useCallback(async (email: string, password: string, stayLoggedIn: boolean) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, stayLoggedIn }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setAccessToken((data as LoginResult).accessToken);
    setUser((data as LoginResult).user);
    // CSRF token is set as a cookie by the server
  }, []);

  const logout = useCallback(async () => {
    const csrfToken = getCsrfTokenFromCookie();
    await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    });
    setAccessToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    // Prevent multiple simultaneous refresh calls
    if (isRefreshing.current) {
      // Wait for the current refresh to complete
      while (isRefreshing.current) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return accessToken;
    }

    isRefreshing.current = true;
    try {
      const csrfToken = getCsrfTokenFromCookie();
      const res = await fetch('/api/auth/refresh', { 
        method: 'POST',
        headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
      });
      if (!res.ok) {
        setAccessToken(null);
        setUser(null);
        // If 403 (CSRF failure), the user needs to re-login to get a CSRF token
        // This can happen if they logged in before CSRF tokens were implemented
        if (res.status === 403) {
          console.warn('CSRF token missing or invalid. Please log in again.');
        }
        return null;
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      if (data.user) {
        setUser(data.user);
      }
      return data.accessToken as string;
    } finally {
      isRefreshing.current = false;
    }
  }, [accessToken]);

  const fetchWithAuth = useCallback(async (input: RequestInfo, init: RequestInit = {}) => {
    let token = accessToken;
    
    // If no token, try to refresh first
    if (!token) {
      token = await refresh();
      if (!token) {
        throw new Error('Not authenticated');
      }
    }
    
    init.headers = { ...(init.headers || {}), Authorization: `Bearer ${token}` };
    let res = await fetch(input, init);
    
    if (res.status === 401) {
      const newToken = await refresh();
      if (newToken) {
        init.headers = { ...(init.headers || {}), Authorization: `Bearer ${newToken}` };
        res = await fetch(input, init);
      }
    }
    return res;
  }, [accessToken, refresh]);

  // Auto-refresh on mount to get initial access token
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      await refresh();
      if (mounted) {
        setIsInitializing(false);
      }
    };
    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional: periodic refresh before expiry (~14m)
  useEffect(() => {
    if (!accessToken) return;
    const id = setInterval(() => {
      refresh();
    }, 14 * 60 * 1000);
    return () => clearInterval(id);
  }, [accessToken, refresh]);

  return { accessToken, user, login, logout, refresh, fetchWithAuth, isInitializing };
}
