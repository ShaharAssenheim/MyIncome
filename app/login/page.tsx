"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Home } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useMemo, useState } from "react";
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
    <main id="main-content" className="login-shell" dir="rtl">
      <section className="login-form" aria-labelledby="login-title">
        <div className="w-full max-w-sm">
          <Link href="/" className="site-brand mb-8" aria-label="MyIncome">
            <span className="brand-symbol">
              <Home size={24} />
            </span>
            <span dir="ltr" className="brand-name">
              MyIncome
            </span>
          </Link>
          <h1 id="login-title" className="ui-page-title mb-7">
            {mode === "login" ? "כניסה לחשבון" : "יצירת חשבון"}
          </h1>
          {error && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMsg ? (
            <Alert role="status">
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full"
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
              </Button>
              <div className="login-divider">
                <Separator className="flex-1" />
                <span className="shrink-0">או באמצעות מייל</span>
                <Separator className="flex-1" />
              </div>
              <form onSubmit={mode === "login" ? handleLogin : handleSignup}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="login-email">כתובת מייל</FieldLabel>
                    <Input
                      id="login-email"
                      autoComplete="email"
                      type="email"
                      required
                      dir="ltr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                    />
                  </Field>
                  {mode === "signup" && (
                    <Field>
                      <FieldLabel htmlFor="login-name">שם משתמש</FieldLabel>
                      <Input
                        id="login-name"
                        autoComplete="nickname"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor="login-password">סיסמה</FieldLabel>
                    <Input
                      id="login-password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      type="password"
                      required
                      minLength={mode === "signup" ? 6 : undefined}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {mode === "signup" && (
                      <FieldDescription>לפחות 6 תווים</FieldDescription>
                    )}
                  </Field>
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading && <Spinner data-icon="inline-start" />}
                    {loading
                      ? "ממשיך…"
                      : mode === "login"
                        ? "כניסה לחשבון"
                        : "יצירת חשבון"}
                  </Button>
                </FieldGroup>
              </form>
              <div className="mt-6 flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError(null);
                  }}
                >
                  {mode === "login" ? "יצירת חשבון" : "כניסה לחשבון"}
                </Button>
              </div>
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
        <main
          id="main-content"
          className="flex min-h-screen items-center justify-center"
        >
          <Spinner />
          <span className="sr-only">טוען…</span>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
