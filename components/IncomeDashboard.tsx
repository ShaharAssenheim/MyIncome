"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Transaction, IncomeType, MonthlyStats } from "../types";
import { MonthSelector } from "../components/MonthSelector";
import {
  DynamicSummaryCard,
  DynamicTrendsChart,
} from "../components/ClientCharts";
import { CategoryCard } from "../components/CategoryCard";
import dynamic from "next/dynamic";
import { useDataQuery } from "../lib/client-data";
import { IncomeRow } from "../lib/income";
import { incomeDateParts } from "../lib/income-date";
const TransactionModal = dynamic(() =>
  import("./TransactionModal.tsx").then((module) => module.TransactionModal),
);
const MonthIncomeEditor = dynamic(() =>
  import("./MonthIncomeEditor.tsx").then((module) => module.MonthIncomeEditor),
);
import { TransactionList } from "../components/TransactionList";
import { useAuth } from "../lib/useAuth";

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
    <main id="main-content" className="min-h-screen text-slate-900">
      <div className="ui-page">
        <h1 className="ui-page-title mb-3">
          הכנסות {person === "shahar" ? "Shahar" : "Kristin"}
        </h1>
        {person === "shahar" && (
          <p className="ui-page-description mb-6">
            משכורות מדוחות הבנק משויכות לחודש העבודה שקדם לקבלתן. תאריך הקבלה
            מוצג לצד כל משכורת.{" "}
            <Link href="/" className="text-indigo-600 underline">
              ייבוא דוחות וניהול החשבון בסקירה הכללית
            </Link>
          </p>
        )}
        {(error || query.error) && (
          <div className="ui-alert mb-6" role="alert">
            {error || query.error}
          </div>
        )}
        {(isInitializing || isLoading) && transactions.length === 0 ? (
          <div className="space-y-6">
            <div className="h-12 bg-slate-200 animate-pulse rounded-xl w-full max-w-md mx-auto"></div>
            <div className="h-32 bg-slate-200 animate-pulse rounded-2xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
              <div className="h-40 bg-slate-200 animate-pulse rounded-2xl"></div>
              <div className="h-40 bg-slate-200 animate-pulse rounded-2xl"></div>
              <div className="h-40 bg-slate-200 animate-pulse rounded-2xl"></div>
            </div>
            <div className="h-64 bg-slate-200 animate-pulse rounded-2xl"></div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-auto">
                <div>
                  <MonthSelector
                    currentDate={currentDate}
                    onPrevMonth={handlePrevMonth}
                    onNextMonth={handleNextMonth}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-600">
                בחירת חודש
                <input
                  type="month"
                  aria-label="בחירת חודש להצגה ולעריכה"
                  value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`}
                  onChange={(event) => {
                    if (!/^\d{4}-\d{2}$/.test(event.target.value)) return;
                    const [year, month] = event.target.value
                      .split("-")
                      .map(Number);
                    setCurrentDate(new Date(year, month - 1, 1));
                  }}
                  className="ui-input w-auto"
                />
              </label>
              {user?.isAdmin && (
                <button
                  onClick={() => setEditingMonth(true)}
                  className="ui-btn-secondary sm:mr-auto"
                >
                  עריכת סכומי החודש
                </button>
              )}
            </div>
            <DynamicSummaryCard stats={stats} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <CategoryCard
                type={IncomeType.CASH}
                amount={stats.cash}
                onAddClick={handleOpenAddModal}
                canAdd={Boolean(user?.isAdmin)}
              />
              <CategoryCard
                type={IncomeType.BIT}
                amount={stats.bit}
                onAddClick={handleOpenAddModal}
                canAdd={Boolean(user?.isAdmin)}
              />
              <CategoryCard
                type={IncomeType.BANK}
                amount={stats.bank}
                onAddClick={handleOpenAddModal}
                canAdd={Boolean(user?.isAdmin)}
              />
            </div>
            <DynamicTrendsChart
              transactions={transactions}
              currentDate={currentDate}
            />
            <div className="w-full">
              <TransactionList
                transactions={currentMonthTransactions}
                onDelete={handleDeleteTransaction}
                canDelete={Boolean(user?.isAdmin)}
                isLoading={isLoading}
              />
            </div>
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
