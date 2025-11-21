import React, { useState, useEffect, useMemo } from 'react';
import appLogo from '/icon.svg';
import { Transaction, IncomeType, MonthlyStats } from './types';
import { MonthSelector } from './components/MonthSelector';
import { SummaryCard } from './components/SummaryCard';
import { CategoryCard } from './components/CategoryCard';
import { TransactionModal } from './components/TransactionModal';
import { TransactionList } from './components/TransactionList';
import { TrendsChart } from './components/TrendsChart';

const STORAGE_KEY = 'income_tracker_data_v1';

function App() {
  // --- State ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<IncomeType | null>(null);

  // --- Lifecycle ---

  // Load from local storage on mount
  useEffect(() => {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setTransactions(parsed);
      } catch (e) {
        console.error("Failed to parse transactions", e);
      }
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

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

  const handleSaveTransaction = (amount: number, description: string) => {
    if (!activeCategory) return;

    const newTransaction: Transaction = {
      id: Math.random().toString(36).substring(2, 15),
      amount,
      type: activeCategory,
      date: currentDate.toISOString(),
      description,
      createdAt: Date.now(), // Use timestamp for sorting
    };

    setTransactions(prev => [...prev, newTransaction]);
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
    // Confirmation is handled in the UI component (TransactionList)
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
        <div className="flex items-center justify-center gap-4 mb-10">
          <img src={appLogo} alt="Money Track logo" className="w-16 h-16 rounded-3xl shadow-lg shadow-teal-500/30" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Money Track</p>
            <p className="text-xl font-semibold text-slate-900">Your Financial Journey</p>
          </div>
        </div>
        
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