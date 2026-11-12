"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AppDialog } from "./AppDialog";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Field, FieldGroup, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
export function SiteAccessManagement({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState<
    {
      email: string;
    }[]
  >([]);
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
  return open ? (
    <AppDialog
      title="ניהול גישה לאתר"
      description="כל מייל מאושר יכול לצפות בכל נתוני האתר. הוספה, העלאה, עריכה ומחיקה זמינות רק למנהל. ביטול הרשאה חוסם גישה מהבקשה הבאה."
      onClose={onClose}
      busy={busy}
      wide
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          update(email, false);
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="access-email">אישור כתובת מייל</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <Input
                id="access-email"
                autoFocus
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-w-40 flex-1"
                dir="ltr"
                placeholder="name@example.com"
              />
              <Button type="submit" disabled={busy}>
                <ShieldCheck data-icon="inline-start" />
                אישור כניסה
              </Button>
            </div>
          </Field>
        </FieldGroup>
      </form>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <ul className="max-h-72 overflow-y-auto divide-y divide-border">
        {emails.map((item) => (
          <li
            key={item.email}
            className="flex items-center justify-between gap-3 py-3"
          >
            <span dir="ltr" className="break-all text-sm">
              {item.email}
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => update(item.email, true)}
            >
              ביטול הרשאה
            </Button>
          </li>
        ))}
      </ul>
    </AppDialog>
  ) : null;
}
