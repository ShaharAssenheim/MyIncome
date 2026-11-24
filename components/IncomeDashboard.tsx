"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilLine } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { CategoryCard } from "../components/CategoryCard";
import { SummaryCard } from "./SummaryCard";
import { MonthSelector } from "../components/MonthSelector";
import { TransactionList } from "../components/TransactionList";
import { useDataQuery } from "../lib/client-data";
import { IncomeRow } from "../lib/income";
import { incomeDateParts } from "../lib/income-date";
import { useAuth } from "../lib/useAuth";
import { IncomeType, MonthlyStats, Transaction } from "../types";
const DynamicTrendsChart = dynamic(
  async () => {
    const mod = await import("./TrendsChart.tsx");
    return mod.TrendsChart;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-2xl border border-border bg-card p-6"
        role="status"
        aria-label="טוען מגמת הכנסות"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent rounded-xl w-10 h-10" />
          <div>
            <Skeleton className="h-5 w-32 bg-muted  rounded"></Skeleton>
            <Skeleton className="h-4 w-24 bg-muted  rounded mt-1"></Skeleton>
          </div>
        </div>
        <Skeleton className="h-[300px] w-full bg-muted  rounded-xl"></Skeleton>
      </div>
    ),
  },
);

const TransactionModal = dynamic(() =>
  import("./TransactionModal.tsx").then((module) => module.TransactionModal),
);
const MonthIncomeEditor = dynamic(() =>
  import("./MonthIncomeEditor.tsx").then((module) => module.MonthIncomeEditor),
);
const mapRowToTransaction = (row: IncomeRow): Transaction => ({
  id: row.id,
  amount: row.amount,
  type: row.type.toUpperCase() as IncomeType,
  date: row.date,
  paymentDate: row.payment_date,
  description: row.description ?? undefined,
  createdAt: row.created_at,
  readOnly: row.read_only ?? false,
});
export function IncomeDashboard({
  person,
  initialData,
}: {
  person: "kristin" | "shahar";
  initialData?: IncomeRow[];
}) {
  const { fetchWithAuth, isInitializing, user } = useAuth();
  const [currentDate, setCurrentDate] = useState(() => {
    const today = incomeDateParts();
    return new Date(today.year, today.month - 1, today.day);
  });
  const query = useDataQuery<IncomeRow[]>(
    `/api/transactions?person=${person}`,
    initialData,
  );
  const transactions = useMemo(
    () => (query.data ?? []).map(mapRowToTransaction),
    [query.data],
  );
  const [editingMonth, setEditingMonth] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<IncomeType | null>(null);
  const isLoading = query.loading;
  const [error, setError] = useState<string | null>(null);
  const handlePrevMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      return newDate;
    });
  };
  const handleNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      return newDate;
    });
  };
  const handleOpenAddModal = (type: IncomeType) => {
    if (!user?.isAdmin) return;
    setActiveCategory(type);
    setIsModalOpen(true);
  };
  const handleSaveTransaction = async (amount: number, description: string) => {
    if (!user?.isAdmin) return;
    if (!activeCategory) return;
    try {
      const res = await fetchWithAuth("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          person,
          type: activeCategory.toLowerCase(),
          date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`,
          description,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setIsModalOpen(false);
    } catch (e) {
      console.error("Failed to save transaction", e);
      setError("Failed to save transaction");
      throw new Error("שמירת ההכנסה נכשלה. אפשר לנסות שוב.");
    }
  };
  const handleDeleteTransaction = async (id: string) => {
    if (!user?.isAdmin) return;
    try {
      const res = await fetchWithAuth(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    } catch (e) {
      console.error("Failed to delete transaction", e);
      setError("Failed to delete transaction");
    }
  };
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = new Date(t.date);
      return (
        tDate.getMonth() === currentDate.getMonth() &&
        tDate.getFullYear() === currentDate.getFullYear()
      );
    });
  }, [transactions, currentDate]);
  const stats: MonthlyStats = useMemo(() => {
    const initial: MonthlyStats = { total: 0, cash: 0, bit: 0, bank: 0 };
    return currentMonthTransactions.reduce((acc, curr) => {
      acc.total = Math.round((acc.total + curr.amount) * 100) / 100;
      if (curr.type === IncomeType.CASH)
        acc.cash = Math.round((acc.cash + curr.amount) * 100) / 100;
      if (curr.type === IncomeType.BIT)
        acc.bit = Math.round((acc.bit + curr.amount) * 100) / 100;
      if (curr.type === IncomeType.BANK)
        acc.bank = Math.round((acc.bank + curr.amount) * 100) / 100;
      return acc;
    }, initial);
  }, [currentMonthTransactions]);
  return (
    <main id="main-content">
      <div className="ui-page flex flex-col gap-6">
        <header>
          <h1 className="ui-page-title">
            הכנסות {person === "shahar" ? "שחר" : "קריסטין"}
          </h1>
          {person === "shahar" && (
            <p className="ui-page-description">
              ההכנסות מוצגות לפי חודש העבודה. תאריך ההפקדה המקורי נשמר בנפרד.
            </p>
          )}
        </header>
        {(error || query.error) && (
          <Alert variant="destructive">
            <AlertDescription>{error || query.error}</AlertDescription>
          </Alert>
        )}
        {(isInitializing || isLoading) && transactions.length === 0 ? (
          <div
            className="flex flex-col gap-5"
            role="status"
            aria-label="טוען הכנסות"
          >
            <Skeleton className="h-16" />
            <Skeleton className="h-64" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-36" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="filter-bar">
              <MonthSelector
                currentDate={currentDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />
              <Separator
                orientation="vertical"
                className="mx-1 hidden h-6 sm:block"
              />
              <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <Label htmlFor="income-month">בחירת חודש</Label>
                <Input
                  id="income-month"
                  type="month"
                  className="w-full min-w-0 sm:w-auto"
                  value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`}
                  onChange={(event) => {
                    if (!/^\d{4}-\d{2}$/.test(event.target.value)) return;
                    const [year, month] = event.target.value
                      .split("-")
                      .map(Number);
                    setCurrentDate(new Date(year, month - 1, 1));
                  }}
                />
              </div>
              {user?.isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMonth(true)}
                  className="sm:ms-auto"
                >
                  <PencilLine data-icon="inline-start" />
                  עריכת החודש
                </Button>
              )}
            </div>
            <SummaryCard stats={stats} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[IncomeType.CASH, IncomeType.BIT, IncomeType.BANK].map(
                (type) => (
                  <CategoryCard
                    key={type}
                    type={type}
                    amount={
                      type === IncomeType.CASH
                        ? stats.cash
                        : type === IncomeType.BIT
                          ? stats.bit
                          : stats.bank
                    }
                    onAddClick={handleOpenAddModal}
                    canAdd={Boolean(user?.isAdmin)}
                  />
                ),
              )}
            </div>
            <DynamicTrendsChart
              transactions={transactions}
              currentDate={currentDate}
              onYearChange={(year) => {
                const today = incomeDateParts();
                const month = year === today.year ? today.month - 1 : 11;
                setCurrentDate(new Date(year, month, 1));
              }}
            />
            <TransactionList
              transactions={currentMonthTransactions}
              onDelete={handleDeleteTransaction}
              canDelete={Boolean(user?.isAdmin)}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
      {editingMonth && user?.isAdmin && (
        <MonthIncomeEditor
          person={person}
          month={
            currentDate.getFullYear() +
            "-" +
            String(currentDate.getMonth() + 1).padStart(2, "0") +
            "-01"
          }
          onClose={() => setEditingMonth(false)}
        />
      )}
      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          type={activeCategory}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTransaction}
        />
      )}
    </main>
  );
}
