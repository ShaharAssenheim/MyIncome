import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction, IncomeType, MonthlyStats } from './types';
import { MonthSelector } from './components/MonthSelector';
import { SummaryCard } from './components/SummaryCard';
import { CategoryCard } from './components/CategoryCard';
import { TransactionModal } from './components/TransactionModal';
import { TransactionList } from './components/TransactionList';
import { TrendsChart } from './components/TrendsChart';
import supabase from './supabaseClient';

const mapRowToTransaction = (row: any): Transaction => ({
  id: row.id,
  amount: row.amount,
  type: row.type as IncomeType,
  date: row.date,
  description: row.description ?? undefined,
  createdAt: row.created_at,
});

function App() {
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<IncomeType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load transactions', error);
      setError('אירעה שגיאה בטעינת הנתונים');
    } else if (data) {
      setTransactions(data.map(mapRowToTransaction));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // --- Handlers ---

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

    const payload = {
      amount,
      type: activeCategory,
      date: currentDate.toISOString(),
      description,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Failed to save transaction', error);
      setError('אירעה שגיאה בשמירת העסקה');
      return;
    }

    if (data) {
      setTransactions(prev => [...prev, mapRowToTransaction(data)]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete transaction', error);
      setError('אירעה שגיאה במחיקת העסקה');
      return;
    }
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // --- Derived State ---

  // Filter transactions for currently selected month/year
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
        // Important: We compare based on the *transaction date* assigned (currentDate from state)
        // OR created date. Here we use the date property which we set to the current view date 
        // when creating the transaction to assign it to that specific month bucket.
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentDate.getMonth() && 
               tDate.getFullYear() === currentDate.getFullYear();
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

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <div className="max-w-md md:max-w-5xl mx-auto px-4 md:px-8 pt-8 md:pt-12">

        {error && (
          <div className="mb-6 rounded-lg bg-rose-100 text-rose-800 px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}
        
        {/* Month Navigation - Centered and constrained width */}
        <div className="flex justify-center mb-8">
            <div className="w-full max-w-md">
                <MonthSelector 
                  currentDate={currentDate} 
                  onPrevMonth={handlePrevMonth} 
                  onNextMonth={handleNextMonth} 
                />
            </div>
        </div>

        {/* Main Stats */}
        <SummaryCard stats={stats} />

        {/* Category Grid - 3 columns on desktop */}
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

        {/* Trends Chart - 6 Month History */}
        <TrendsChart transactions={transactions} currentDate={currentDate} />

        {/* Transaction History - Full Width */}
        <div className="w-full">
            <TransactionList 
                transactions={currentMonthTransactions} 
                onDelete={handleDeleteTransaction}
                isLoading={isLoading}
            />
        </div>
      </div>

      {/* Add Modal */}
      <TransactionModal 
        isOpen={isModalOpen} 
        type={activeCategory} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTransaction} 
      />
    </div>
  );
}

export default App;