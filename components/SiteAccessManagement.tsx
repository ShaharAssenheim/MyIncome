"use client";
import { useEffect, useState } from "react";
import { AppDialog } from "./AppDialog";
import { ShieldCheck } from "lucide-react";

export function SiteAccessManagement() {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState<{ email: string }[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/access", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEmails(result);
    } catch {
      setError("טעינת המורשים נכשלה");
    }
  }
  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  async function update(value: string, remove: boolean) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/access", {
        method: remove ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!remove) setEmail("");
      await load();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "העדכון נכשל");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-btn-quiet"
        aria-label="ניהול גישה"
        aria-haspopup="dialog"
      >
        <ShieldCheck size={18} aria-hidden="true" />
        <span className="hidden md:inline">ניהול גישה</span>
      </button>
      {open && (
        <AppDialog
          title="מורשים לכניסה לאתר"
          onClose={() => setOpen(false)}
          busy={busy}
          wide
        >
          <p className="ui-dialog-description">
            כל מייל מאושר יכול לצפות בכל נתוני האתר. הוספה, העלאה, עריכה ומחיקה
            זמינות רק למנהל. ביטול הרשאה חוסם גישה החל מהבקשה הבאה.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              update(email, false);
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              autoFocus
              aria-label="מייל לאישור"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="ui-input min-w-0 flex-1"
              dir="ltr"
              placeholder="name@example.com"
            />
            <button disabled={busy} className="ui-btn-primary">
              אישור כניסה
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-sm text-rose-700">
              {error}
            </p>
          )}
          <ul className="mt-5 max-h-72 overflow-y-auto divide-y divide-slate-100">
            {emails.map((item) => (
              <li
                key={item.email}
                className="flex items-center justify-between gap-3 py-3"
              >
                <span dir="ltr" className="break-all text-sm">
                  {item.email}
                </span>
                <button
                  disabled={busy}
                  onClick={() => update(item.email, true)}
                  className="ui-btn-danger shrink-0"
                >
                  ביטול הרשאה
                </button>
              </li>
            ))}
          </ul>
        </AppDialog>
      )}
    </>
  );
}
