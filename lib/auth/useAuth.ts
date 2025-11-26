"use client";
import { useState, useEffect, useCallback } from 'react';

interface User { id: string; email: string; username: string }
interface LoginResult { accessToken: string; user: User }

// Simple client auth hook that stores access token in memory only (not localStorage) for security.
// Automatically attempts refresh on 401 responses when using fetchWithAuth.
export function useAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

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
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAccessToken(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) {
      setAccessToken(null);
      setUser(null);
      return null;
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    if (data.user) {
      setUser(data.user);
    }
    return data.accessToken as string;
  }, []);

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
    refresh();
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

  return { accessToken, user, login, logout, refresh, fetchWithAuth };
}
