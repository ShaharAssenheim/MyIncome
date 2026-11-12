"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { invalidateData } from "./client-data";
import { createClient } from "./supabase/client";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  username: string;
  isAdmin?: boolean;
}

function useAuthState() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const currentUserId = useRef<string | null | undefined>(undefined);
  const profileRequest = useRef<Promise<User | null> | null>(null);
  const supabase = useMemo(() => createClient(), []);

  // Fetch the auth_users profile (contains the real username for existing users)
  const fetchProfile = useCallback(async (): Promise<User | null> => {
    if (profileRequest.current) return profileRequest.current;
    const request = (async () => {
      const res = await fetch("/api/users/me");
      if (res.status === 403 || res.status === 401) {
        invalidateData();
        if (window.location.pathname !== "/login")
          window.location.assign("/login?error=access_denied");
        return null;
      }
      if (!res.ok) return null;
      return res.json();
    })();
    profileRequest.current = request;
    try {
      return await request;
    } finally {
      if (profileRequest.current === request) profileRequest.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange fires INITIAL_SESSION synchronously from the local cookie
    // (no network round-trip), so isInitializing becomes false almost instantly.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const nextId = session?.user?.id ?? null;
      if (nextId !== currentUserId.current) {
        if (currentUserId.current !== undefined) invalidateData();
        currentUserId.current = nextId;
        profileRequest.current = null;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        // Unblock the page immediately — don't wait for the profile fetch
        if (mounted) setIsInitializing(false);
      }

      if (session?.user) {
        // Fetch the profile in the background; doesn't delay data loading
        fetchProfile()
          .then((profile) => {
            if (!mounted || currentUserId.current !== session.user.id) return;
            setUser(profile);
            setIsInitializing(false);
          })
          .catch(() => {
            if (mounted && currentUserId.current === session.user.id) {
              setUser(null);
              setIsInitializing(false);
            }
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

  useEffect(() => {
    const refresh = () => {
      if (!currentUserId.current) return;
      fetchProfile()
        .then((profile) => {
          if (profile?.id === currentUserId.current) setUser(profile);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) throw new Error("Logout failed");
    invalidateData();
    setUser(null);
  }, []);

  // Session is managed via cookies — same-origin fetch sends them automatically.
  // Middleware validates the cookie and sets x-user-id on every authenticated request.
  const fetchWithAuth = useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      const res = await fetch(input, init);
      if (
        res.ok &&
        init.method &&
        !["GET", "HEAD"].includes(init.method.toUpperCase())
      ) {
        invalidateData();
        router.refresh();
      }
      if (res.status === 401 || res.status === 403) {
        window.location.href =
          res.status === 403 ? "/login?error=access_denied" : "/login";
        throw new Error("Not authenticated");
      }
      return res;
    },
    [router],
  );

  return { user, isInitializing, logout, fetchWithAuth };
}

const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthState();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is missing");
  return auth;
}
