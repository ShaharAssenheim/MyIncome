"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useEffect, useState } from "react";
import { useAuth } from "../lib/useAuth";
import { AppDialog } from "./AppDialog";
export function MonthIncomeEditor({
  person,
  month,
  onClose,
}: {
  person: "shahar" | "kristin";
  month: string;
  onClose: () => void;
}) {
  const { fetchWithAuth } = useAuth();
  const [amounts, setAmounts] = useState({ cash: "", bit: "", bank: "" });
  const [version, setVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetchWithAuth(`/api/income/month?person=${person}&month=${month}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) {
          setAmounts({
            cash: Number(result.cash).toFixed(2),
            bit: Number(result.bit).toFixed(2),
            bank: Number(result.bank).toFixed(2),
          });
          setVersion(result.version);
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [person, month, fetchWithAuth]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetchWithAuth("/api/income/month", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person,
          month,
          version,
          cash: Number(amounts.cash),
          bit: Number(amounts.bit),
          bank: Number(amounts.bank),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }
  return (
    <AppDialog
      title={`עריכת חודש · ${month.slice(0, 7)}`}
      description="עדכון הסכומים החודשיים בכל קטגוריה. רישומי המקור נשמרים, וגם ייבוא נוסף ישמור את הסכום שקבעתם."
      onClose={onClose}
      busy={saving}
    >
      {loading ? (
        <div role="status" className="flex items-center gap-2 py-8">
          <Spinner />
          טוען את החודש…
        </div>
      ) : (
        <form onSubmit={save}>
          <FieldGroup>
            {(["cash", "bit", "bank"] as const).map((category) => (
              <Field key={category}>
                <FieldLabel htmlFor={`month-${category}`}>
                  {
                    { cash: "מזומן", bit: "Bit", bank: "העברה בנקאית" }[
                      category
                    ]
                  }
                </FieldLabel>
                <Input
                  id={`month-${category}`}
                  required
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  max="1000000000000"
                  value={amounts[category]}
                  onChange={(event) =>
                    setAmounts((current) => ({
                      ...current,
                      [category]: event.target.value,
                    }))
                  }
                />
              </Field>
            ))}
            <Separator />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                ביטול
              </Button>
              <Button
                type="submit"
                disabled={
                  saving || !amounts.cash || !amounts.bit || !amounts.bank
                }
              >
                {saving && <Spinner data-icon="inline-start" />}
                {saving ? "שומר…" : "שמירת החודש"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </AppDialog>
  );
}
