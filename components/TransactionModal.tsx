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
import { useState } from "react";
import { CATEGORIES } from "../constants";
import { IncomeType } from "../types";
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
      <form onSubmit={save}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-income-amount">סכום בש״ח</FieldLabel>
            <Input
              id="new-income-amount"
              autoFocus
              type="number"
              inputMode="decimal"
              required
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-income-note">הערה</FieldLabel>
            <Input
              id="new-income-note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="מקור ההכנסה או פרטים נוספים"
            />
            <FieldDescription>לא חובה</FieldDescription>
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Separator />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              ביטול
            </Button>
            <Button
              type="submit"
              disabled={saving || !amount || Number(amount) <= 0}
            >
              {saving && <Spinner data-icon="inline-start" />}
              {saving ? "שומר…" : "שמירת הכנסה"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </AppDialog>
  );
}
