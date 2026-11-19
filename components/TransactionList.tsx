"use client";
import { CalendarDays, Trash2 } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, getCategoryIcon } from "../constants";
import { Transaction } from "../types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { Spinner } from "./ui/spinner";

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
    <Card>
      <CardHeader>
        <CardTitle>תנועות החודש</CardTitle>
        <CardAction>
          <Badge variant="secondary">{sorted.length} תנועות</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!sorted.length ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {isLoading ? <Spinner /> : <CalendarDays />}
              </EmptyMedia>
              <EmptyTitle>
                {isLoading ? "טוען נתונים…" : "אין הכנסות בחודש הנבחר"}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul>
            {sorted.map((t) => (
              <li key={t.id} className="entry-row">
                <span
                  className="metric-card-icon shrink-0"
                  style={{
                    color: CATEGORIES[t.type].color,
                    background: `color-mix(in srgb,${CATEGORIES[t.type].color} 8%,transparent)`,
                  }}
                  aria-hidden="true"
                >
                  {getCategoryIcon(t.type, 17)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="ui-number text-base font-medium">
                    {new Intl.NumberFormat("he-IL", {
                      style: "currency",
                      currency: "ILS",
                      maximumFractionDigits: 2,
                    }).format(t.amount)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {CATEGORIES[t.type].label}
                  </p>
                  {t.description && (
                    <p className="entry-description">{t.description}</p>
                  )}
                </div>
                <div className="ms-auto flex items-center gap-3">
                  <time
                    className="text-[11px] text-muted-foreground"
                    dateTime={t.paymentDate ?? t.date}
                    title={
                      t.paymentDate ? "תאריך קבלת המשכורת בבנק" : undefined
                    }
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
                  {canDelete && !t.readOnly && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="מחיקת תנועה"
                      onClick={() => setConfirmId(t.id)}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <AlertDialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את התנועה?</AlertDialogTitle>
            <AlertDialogDescription>
              התנועה תוסר מרשימת ההכנסות והסיכומים החודשיים יתעדכנו בהתאם.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirmId) onDelete(confirmId);
                setConfirmId(null);
              }}
            >
              מחיקת התנועה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
