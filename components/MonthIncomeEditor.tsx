"use client";
import { useEffect, useState } from "react";
import { AppDialog } from "./AppDialog";
import { useAuth } from "../lib/useAuth";

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
      title={`עריכת סכומי חודש · ${month.slice(0, 7)}`}
      description="הסכומים שתגדיר מחליפים את הסיכום החודשי. רישומי המקור נשמרים, וייבוא דוחות נוסף ישמור את הסכום הידני."
      onClose={onClose}
      busy={saving}
    >
      {loading ? (
        <p role="status">טוען את החודש…</p>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {(["cash", "bit", "bank"] as const).map((category) => (
            <label key={category} className="block text-sm font-medium">
              {{ cash: "מזומן", bit: "Bit", bank: "העברה בנקאית" }[category]}
              <input
                required
                type="number"
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
                className="ui-input mt-2"
              />
            </label>
          ))}
          <div className="flex gap-3">
            <button
              disabled={
                saving || !amounts.cash || !amounts.bit || !amounts.bank
              }
              className="ui-btn-primary"
            >
              {saving ? "שומר…" : "שמירת החודש"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="ui-btn-secondary"
            >
              סגירה
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      {loading && (
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-xl bg-slate-100 px-4 py-2"
        >
          סגירה
        </button>
      )}
    </AppDialog>
  );
}
