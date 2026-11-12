"use client";
import { useState } from "react";
import { Transaction } from "../types";
import { CATEGORIES, getCategoryIcon } from "../constants";
import { Trash2, Check, X, CalendarDays } from "lucide-react";
export function TransactionList({
  transactions,
  onDelete,
  isLoading,
  canDelete = true,
}: {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  isLoading?: boolean;
  canDelete?: boolean;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return (
    <section className="ui-panel">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">תנועות החודש</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
          {sorted.length} תנועות
        </span>
      </div>
      {!sorted.length ? (
        <div className="ui-empty" role="status">
          <CalendarDays size={26} className="mx-auto mb-3 text-slate-400" />
          {isLoading ? "טוען נתונים…" : "לא נוספו תנועות החודש"}
        </div>
      ) : (
        <ul>
          {sorted.map((t) => (
            <li key={t.id} className="ui-entry">
              <div
                className={`shrink-0 rounded-xl p-3 ${CATEGORIES[t.type].iconColor} ${CATEGORIES[t.type].bgStart}`}
                aria-hidden="true"
              >
                {getCategoryIcon(t.type, 19)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="ui-number font-semibold text-slate-900">
                  {new Intl.NumberFormat("he-IL", {
                    style: "currency",
                    currency: "ILS",
                    maximumFractionDigits: 2,
                  }).format(t.amount)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {CATEGORIES[t.type].label}
                </p>
                {t.description && (
                  <p className="ui-entry-description" title={t.description}>
                    {t.description}
                  </p>
                )}
              </div>
              <div className="ui-entry-actions">
                <time
                  className="text-xs text-slate-500"
                  dateTime={t.paymentDate ?? t.date}
                  title={t.paymentDate ? "תאריך קבלת המשכורת בבנק" : undefined}
                >
                  {t.paymentDate && "התקבל ב־"}
                  {new Date(t.paymentDate ?? t.date).toLocaleDateString(
                    "he-IL",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      ...(t.paymentDate ? { year: "numeric" as const } : {}),
                      timeZone: "Asia/Jerusalem",
                    },
                  )}
                </time>
                {canDelete &&
                  !t.readOnly &&
                  (confirmId === t.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-rose-700">למחוק?</span>
                      <button
                        className="ui-icon-btn text-rose-700"
                        aria-label="אישור מחיקה"
                        onClick={() => {
                          onDelete(t.id);
                          setConfirmId(null);
                        }}
                      >
                        <Check size={17} />
                      </button>
                      <button
                        className="ui-icon-btn"
                        aria-label="ביטול מחיקה"
                        onClick={() => setConfirmId(null)}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="ui-icon-btn text-slate-400"
                      aria-label="מחיקת תנועה"
                      onClick={() => setConfirmId(t.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
