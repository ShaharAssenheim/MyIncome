"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { FileCheck, FileSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
    <Card>
      <CardHeader>
        <CardTitle>ייבוא דוח בנק</CardTitle>
        <CardDescription>
          תדפיס תנועות של בנק הפועלים בקובץ PDF, עד 4MB. תנועות קיימות מזוהות גם
          בדוחות חופפים.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="bank-pdf">בחירת דוח להעלאה</FieldLabel>
            <Input
              id="bank-pdf"
              ref={input}
              type="file"
              accept=".pdf"
              disabled={busy}
              className="h-auto border-dashed p-4"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setMessage("");
              }}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={!file || busy}
            className="self-start"
            onClick={() => upload(true)}
          >
            {busy ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <FileSearch data-icon="inline-start" />
            )}
            {busy ? "מעבד את הדוח…" : "בדיקת הדוח"}
          </Button>
          {preview && (
            <Alert>
              <FileCheck />
              <AlertTitle>הדוח מוכן לייבוא</AlertTitle>
              <AlertDescription>
                <p>
                  חשבון המסתיים ב־{preview.account.slice(-4)} · {preview.from} —{" "}
                  {preview.to}
                </p>
                <p>
                  {preview.rows} תנועות, מתוכן {preview.salaries} תנועות שכר.
                </p>
                <Button
                  type="button"
                  disabled={busy}
                  className="mt-3"
                  onClick={() => upload(false)}
                >
                  ייבוא למסד הנתונים
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert
              variant={hasError ? "destructive" : "default"}
              role={hasError ? "alert" : "status"}
            >
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
