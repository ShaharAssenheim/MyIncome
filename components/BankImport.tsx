"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function BankImport({ onImported }: { onImported: () => void }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    token: string;
    account: string;
    rows: number;
    salaries: number;
    from: string;
    to: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function upload(previewOnly: boolean) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    setHasError(false);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("preview", String(previewOnly));
      if (!previewOnly && preview) form.set("preview_token", preview.token);
      const response = await fetch("/api/finance/import", {
        method: "POST",
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (previewOnly) setPreview(result);
      else {
        setMessage(
          `נוספו ${result.inserted} תנועות. ${result.duplicates} תנועות כבר קיימות.`,
        );
        setPreview(null);
        setFile(null);
        if (input.current) input.current.value = "";
        onImported();
        router.refresh();
      }
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "הייבוא נכשל");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ui-panel border-indigo-200">
      <h2 className="mb-2 font-bold text-slate-800">ייבוא דוח בנק</h2>
      <p className="mb-4 text-sm text-slate-600">
        תדפיס תנועות חודשי של בנק הפועלים, PDF עד 4MB. תנועות קיימות מזוהות גם
        בדוחות חופפים.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={input}
          aria-label="דוח בנק לייבוא"
          type="file"
          accept=".pdf"
          disabled={busy}
          className="max-w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-slate-700"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
            setMessage("");
          }}
        />
        <button
          disabled={!file || busy}
          onClick={() => upload(true)}
          className="ui-btn-secondary"
        >
          {busy ? "מעבד את הדוח…" : "בדיקת הדוח"}
        </button>
      </div>
      {preview && (
        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm">
          <p>
            חשבון המסתיים ב־{preview.account.slice(-4)} · {preview.from} —{" "}
            {preview.to}
          </p>
          <p className="my-2">
            {preview.rows} תנועות, מתוכן {preview.salaries} תנועות שכר.
          </p>
          <button
            disabled={busy}
            onClick={() => upload(false)}
            className="ui-btn-primary"
          >
            ייבוא למסד הנתונים
          </button>
        </div>
      )}
      {message && (
        <p
          role={hasError ? "alert" : "status"}
          className={`mt-4 ${hasError ? "ui-alert" : "ui-success"}`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
