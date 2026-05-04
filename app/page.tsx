"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, IncomeType, MonthlyStats } from '../types';
import { MonthSelector } from '../components/MonthSelector';
import { DynamicSummaryCard, DynamicTrendsChart } from '../components/ClientCharts';
import { CategoryCard } from '../components/CategoryCard';
import { TransactionModal } from '../components/TransactionModal';
import { TransactionList } from '../components/TransactionList';
import { useAuth } from '../lib/useAuth';
import { ShareManagement } from '../components/ShareManagement';

const mapRowToTransaction = (row: any): Transaction => ({
  id: row.id,
  amount: row.amount,
  type: row.type.toUpperCase() as IncomeType,
  date: row.date,
  description: row.description ?? undefined,
  createdAt: row.created_at,
});

export default function Page() {
  const { fetchWithAuth, logout, user, isInitializing } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<IncomeType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/transactions');
      if (!res.ok) {
        throw new Error('Failed to fetch');
      }
      const data = await res.json();
      setTransactions(data.map(mapRowToTransaction));
    } catch (e: any) {
      console.error('Failed to load transactions', e);
      // If not authenticated, redirect to login
      if (e.message === 'Not authenticated') {
        window.location.href = '/login';
        return;
      }
      setError('Failed to load data');
      setTransactions([]);
    }
    setIsLoading(false);
  }, [fetchWithAuth]);

  // Fetch transactions on mount — middleware validates the session cookie
  // server-side, so we don't need to wait for client-side auth to settle.
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      if (mounted) await fetchTransactions();
    };
    loadData();
    return () => { mounted = false; };
  }, [fetchTransactions]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };
  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };
  const handleOpenAddModal = (type: IncomeType) => {
    setActiveCategory(type);
    setIsModalOpen(true);
  };
  const handleSaveTransaction = async (amount: number, description: string) => {
    if (!activeCategory) return;
    try {
      const res = await fetchWithAuth('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: activeCategory.toLowerCase(),
          date: currentDate.toISOString().split('T')[0],
          description,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      setTransactions(prev => [...prev, mapRowToTransaction(data)]);
      setIsModalOpen(false);
    } catch (e) {
      console.error('Failed to save transaction', e);
      setError('Failed to save transaction');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error('Failed to delete transaction', e);
      setError('Failed to delete transaction');
    }
  };

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
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
      acc.total += curr.amount;
      if (curr.type === IncomeType.CASH) acc.cash += curr.amount;
      if (curr.type === IncomeType.BIT) acc.bit += curr.amount;
      if (curr.type === IncomeType.BANK) acc.bank += curr.amount;
      return acc;
    }, initial);
  }, [currentMonthTransactions]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
        <div className="flex items-center justify-between mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg shadow-md">
              {user?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">ברוך הבא</p>
              <p className="text-base font-semibold text-slate-800">{user?.username || 'טוען...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ShareManagement fetchWithAuth={fetchWithAuth} />
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-800 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              התנתק
            </button>
          </div>
        </div>
        {error && (
          <div className="mb-6 rounded-lg bg-rose-100 text-rose-800 px-4 py-3 text-sm text-center">
            {error}
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
            <div className="flex justify-center mb-8">
              <div className="w-full max-w-md">
                <MonthSelector
                  currentDate={currentDate}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                />
              </div>
            </div>
            <DynamicSummaryCard stats={stats} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 mb-10">
          <CategoryCard
            type={IncomeType.CASH}
            amount={stats.cash}
            onAddClick={handleOpenAddModal}
            delay={0.1}
          />
          <CategoryCard
            type={IncomeType.BIT}
            amount={stats.bit}
            onAddClick={handleOpenAddModal}
            delay={0.2}
          />
          <CategoryCard
            type={IncomeType.BANK}
            amount={stats.bank}
            onAddClick={handleOpenAddModal}
            delay={0.3}
          />
        </div>
            <DynamicTrendsChart transactions={transactions} currentDate={currentDate} />
            <div className="w-full">
              <TransactionList
                transactions={currentMonthTransactions}
                onDelete={handleDeleteTransaction}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>
      <TransactionModal
        isOpen={isModalOpen}
        type={activeCategory}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}