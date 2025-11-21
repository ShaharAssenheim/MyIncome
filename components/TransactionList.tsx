import React, { useState } from 'react';
import { Transaction } from '../types';
import { CATEGORIES, getCategoryIcon } from '../constants';
import { Trash2, Check, X, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete }) => {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Sort by created (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => b.createdAt - a.createdAt);

  if (sortedTransactions.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-12 text-slate-400 bg-white/60 rounded-3xl border-2 border-slate-100 border-dashed"
      >
        <div className="bg-slate-50 p-4 rounded-full mb-3 shadow-sm">
            <Calendar size={32} className="opacity-50 text-slate-500" />
        </div>
        <p className="font-medium text-slate-500">לא נוספו תנועות החודש</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2 pt-2">
          <h3 className="font-bold text-slate-800 text-lg">היסטוריית תנועות</h3>
          <div className="bg-slate-200/50 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              {sortedTransactions.length} תנועות
          </div>
      </div>

      <div className="relative pb-10">
        <AnimatePresence initial={false} mode="popLayout">
          {sortedTransactions.map((t) => {
            const config = CATEGORIES[t.type];
            const isConfirming = confirmId === t.id;
            
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={`
                    group relative overflow-hidden
                    bg-white rounded-2xl p-4 shadow-sm border border-slate-100
                    mb-3 last:mb-0
                    hover:shadow-md hover:border-slate-200 hover:bg-slate-50/30
                    transition-colors duration-200
                `}
              >
                 <div className="flex items-center justify-between relative z-10">
                    {/* Left Side: Icon & Info */}
                    <div className={`flex items-center gap-4 transition-all duration-300 ${isConfirming ? 'opacity-40 blur-[1px]' : 'opacity-100'}`}>
                        <div className={`p-3 rounded-2xl shadow-sm ${config.bgStart} ${config.iconColor}`}>
                            {getCategoryIcon(t.type, 22)}
                        </div>
                        
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-slate-800 leading-none mb-1">
                                {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(t.amount)}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span className={`font-medium text-xs px-1.5 py-0.5 rounded bg-slate-50 ${config.textColor}`}>
                                    {config.label}
                                </span>
                                {t.description && (
                                    <>
                                        <span className="text-slate-300 text-xs">•</span>
                                        <span className="truncate max-w-[100px] sm:max-w-[150px] text-xs text-slate-400" title={t.description}>
                                            {t.description}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Date & Actions */}
                    <div className="flex items-center">
                        <AnimatePresence mode="wait">
                            {isConfirming ? (
                                <motion.div 
                                    key="confirm"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="flex items-center gap-2"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(t.id);
                                            setConfirmId(null);
                                        }}
                                        className="p-2 bg-red-500 text-white rounded-xl shadow-md shadow-red-200 hover:bg-red-600 active:scale-90 transition-all"
                                        aria-label="Confirm Delete"
                                    >
                                        <Check size={18} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmId(null);
                                        }}
                                        className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 active:scale-90 transition-all"
                                        aria-label="Cancel Delete"
                                    >
                                        <X size={18} strokeWidth={3} />
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="actions"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-end gap-1"
                                >
                                    <div className="flex items-center gap-1 text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-lg mb-1">
                                        <Clock size={10} />
                                        {new Date(t.createdAt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmId(t.id);
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 opacity-100 sm:opacity-0 group-hover:opacity-100"
                                        aria-label="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                 </div>
                 
                 {/* Decorative background glow for category */}
                 <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-[0.03] pointer-events-none ${config.iconColor.replace('text-', 'bg-')}`}></div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
