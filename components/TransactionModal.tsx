"use client";
import { useState } from "react";
import { IncomeType } from "../types";
import { CATEGORIES } from "../constants";
import { AppDialog } from "./AppDialog";
export function TransactionModal({
  isOpen,
  type,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  type: IncomeType | null;
  onClose: () => void;
  onSave: (amount: number, description: string) => void | Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  if (!isOpen || !type) return null;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !Number.isFinite(Number(amount)) || Number(amount) <= 0)
      return;
    setSaving(true);
    setError("");
    try {
      await onSave(Number(amount), description);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }
  return (
    <AppDialog
      title={`הוספת ${CATEGORIES[type].label}`}
      description="ההכנסה תתווסף לחודש שבחרת."
      onClose={onClose}
      busy={saving}
    >
      <form onSubmit={save} className="space-y-5">
        <label className="ui-field">
          <span className="ui-label">סכום בש״ח</span>
          <input
            autoFocus
            className="ui-input ui-number text-xl"
            type="number"
            inputMode="decimal"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <label className="ui-field">
          <span className="ui-label">
            הערה <span className="font-normal text-slate-400">· לא חובה</span>
          </span>
          <input
            className="ui-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="מקור ההכנסה או פרטים נוספים"
          />
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
          <button
            type="button"
            className="ui-btn-secondary"
            disabled={saving}
            onClick={onClose}
          >
            ביטול
          </button>
          <button
            className="ui-btn-primary"
            disabled={saving || !amount || Number(amount) <= 0}
          >
            {saving ? "שומר…" : "שמירת הכנסה"}
          </button>
        </div>
      </form>
    </AppDialog>
  );
}
