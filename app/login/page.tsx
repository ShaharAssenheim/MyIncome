"use client";
import React, { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "../../lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextTarget = searchParams.get("next") || "/";

  // Show the real error from the callback URL (?error=...&detail=...)
  const callbackError = searchParams.get("error");
  const callbackDetail = searchParams.get("detail");
  const [error, setError] = useState<string | null>(
    callbackError === "access_denied"
      ? "כתובת המייל אינה מאושרת לכניסה. יש לפנות למנהל האתר."
      : callbackError
        ? callbackDetail
          ? `Authentication failed: ${callbackDetail}`
          : "Authentication failed — check Supabase dashboard settings"
        : null,
  );

  const supabase = useMemo(() => createClient(), []);

  function getSafeNextTarget() {
    if (!nextTarget.startsWith("/") || nextTarget.startsWith("//")) return "/";
    return nextTarget;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.replace(getSafeNextTarget());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
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
        setSuccessMsg("נשלח מייל לאימות. בדוק את תיבת הדואר שלך.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signup failed");
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
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        window.location.origin;
      const callbackUrl = new URL("/api/auth/callback", siteUrl);
      callbackUrl.searchParams.set("next", getSafeNextTarget());

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
    } catch (e) {
      setLoading(false);
      setError(e instanceof Error ? e.message : "Google login failed");
    }
  }

  return (
    <main id="main-content" className="ui-login" dir="rtl">
      <aside className="ui-login-story">
        <span className="ui-login-wordmark" dir="ltr">
          MyIncome.
        </span>
        <div>
          <span className="ui-login-eyebrow">התמונה הכלכלית שלכם</span>
          <h2>
            כל ההכנסות.
            <br />
            מקום אחד ברור.
          </h2>
          <p>
            עוקבים אחרי ההכנסות של שחר וקריסטין, מבינים את המגמות ורואים את מצב
            החשבון לאורך השנים.
          </p>
          <div className="ui-login-preview" aria-hidden="true">
            <span>הכנסות · חיסכון · תמונה מלאה</span>
            <div className="ui-login-bars">
              {[36, 53, 43, 70, 58, 80, 66, 96, 82, 100, 90, 115].map(
                (height, index) => (
                  <i key={index} style={{ height }} />
                ),
              )}
            </div>
            <span className="text-xs text-indigo-200">
              יותר בהירות. החלטות טובות יותר.
            </span>
          </div>
        </div>
        <p className="text-xs text-indigo-200">סביבת המידע המשפחתית שלכם</p>
      </aside>
      <section className="ui-login-form">
        <div className="w-full max-w-sm">
          <span
            className="mb-8 block text-lg font-bold text-indigo-600 lg:hidden"
            dir="ltr"
          >
            MyIncome.
          </span>
          <h1 className="ui-page-title">
            {mode === "login" ? "ברוכים הבאים" : "יצירת חשבון"}
          </h1>
          <p className="ui-page-description mb-7">
            הכניסה זמינה לכתובות מייל שאושרו על ידי מנהל האתר.
          </p>
          {error && (
            <div className="ui-alert mb-5" role="alert">
              {error}
            </div>
          )}
          {successMsg ? (
            <div className="ui-success" role="status">
              {successMsg}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="ui-btn-secondary w-full"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M44 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11.2a9.6 9.6 0 0 1-4.2 6.3v5.2h6.8C41.8 36.1 44 30.8 44 24.5Z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 45c5.6 0 10.3-1.9 13.8-5.3L31 34.5c-1.9 1.3-4.3 2.1-7 2.1-5.4 0-10-3.7-11.7-8.7H5.2v5.4A20.8 20.8 0 0 0 24 45Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.3 27.9a12.5 12.5 0 0 1 0-7.8v-5.4H5.2a21 21 0 0 0 0 18.6l7.1-5.4Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M24 11.4c3 0 5.8 1 7.9 3.1l5.9-5.9A19.7 19.7 0 0 0 24 3 20.8 20.8 0 0 0 5.2 14.7l7.1 5.4c1.7-5 6.3-8.7 11.7-8.7Z"
                  />
                </svg>
                המשך עם Google
              </button>
              <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                או באמצעות מייל
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <form
                onSubmit={mode === "login" ? handleLogin : handleSignup}
                className="space-y-5"
              >
                <label className="ui-field">
                  <span className="ui-label">כתובת מייל</span>
                  <input
                    autoComplete="email"
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ui-input"
                    placeholder="name@example.com"
                  />
                </label>
                {mode === "signup" && (
                  <label className="ui-field">
                    <span className="ui-label">שם משתמש</span>
                    <input
                      autoComplete="nickname"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="ui-input"
                    />
                  </label>
                )}
                <label className="ui-field">
                  <span className="ui-label">סיסמה</span>
                  <input
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    type="password"
                    required
                    minLength={mode === "signup" ? 6 : undefined}
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ui-input"
                    placeholder={
                      mode === "signup" ? "לפחות 6 תווים" : undefined
                    }
                  />
                </label>
                <button disabled={loading} className="ui-btn-primary w-full">
                  {loading
                    ? "ממשיך…"
                    : mode === "login"
                      ? "כניסה לחשבון"
                      : "יצירת חשבון"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-slate-500">
                {mode === "login" ? "אין לך חשבון?" : "כבר יש לך חשבון?"}{" "}
                <button
                  disabled={loading}
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError(null);
                  }}
                  className="rounded text-indigo-700 underline underline-offset-4"
                >
                  {mode === "login" ? "יצירת חשבון" : "כניסה לחשבון"}
                </button>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <LoginForm />
    </Suspense>
  );
}
