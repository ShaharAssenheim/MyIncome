import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { IncomeType } from '../types';
import { CATEGORIES, getCategoryIcon } from '../constants';

interface TransactionModalProps {
  isOpen: boolean;
  type: IncomeType | null;
  onClose: () => void;
  onSave: (amount: number, description: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, type, onClose, onSave }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset form on close/open
  useEffect(() => {
    if (!isOpen) {
      setAmount('');
      setDescription('');
    }
  }, [isOpen]);

  if (!isOpen || !type) return null;

  const config = CATEGORIES[type];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && numAmount > 0) {
      onSave(numAmount, description);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className={`p-6 bg-gradient-to-l ${config.bgStart} ${config.bgEnd} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white/80 backdrop-blur rounded-xl ${config.iconColor}`}>
              {getCategoryIcon(type, 20)}
            </div>
            <h3 className={`text-lg font-bold ${config.textColor}`}>
              הוספת {config.label}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/50 transition-colors text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium text-slate-500 block">
              סכום (בש״ח)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                step="any"
                className="w-full text-4xl font-bold text-slate-800 placeholder:text-slate-200 border-b-2 border-slate-100 py-2 focus:outline-none focus:border-slate-300 bg-transparent transition-colors"
                required
              />
              <span className="absolute left-0 bottom-4 text-xl font-medium text-slate-400">
                ₪
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-slate-500 block">
              הערה (אופציונלי)
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="לדוגמה: מתנה מסבתא"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ backgroundColor: config.color }}
            >
              <Check size={20} />
              שמירה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};