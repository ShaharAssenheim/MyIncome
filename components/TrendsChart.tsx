"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Transaction, IncomeType } from '../types';
import { CATEGORIES } from '../constants';
import { BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrendsChartProps {
  transactions: Transaction[];
  currentDate: Date;
}

export const TrendsChart: React.FC<TrendsChartProps> = ({ transactions, currentDate }) => {
  const [isLoading, setIsLoading] = useState(true);

  const MotionDiv = motion.div as any;

  // Simulate loading effect when date changes to give a sense of data processing
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [currentDate]);

  const data = useMemo(() => {
    const last6Months = [];
    // Create array of last 6 months ending at currentDate
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - i);
      last6Months.push(d);
    }

    return last6Months.map(date => {
      const monthKey = date.getMonth();
      const yearKey = date.getFullYear();
      
      // Filter transactions for this specific month
      const monthlyTrans = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === monthKey && tDate.getFullYear() === yearKey;
      });

      // Sum up by category
      const stats = {
        name: new Intl.DateTimeFormat('he-IL', { month: 'short' }).format(date),
        fullDate: new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(date),
        [IncomeType.CASH]: 0,
        [IncomeType.BIT]: 0,
        [IncomeType.BANK]: 0,
        total: 0
      };

      monthlyTrans.forEach(t => {
        if (stats[t.type] !== undefined) {
          stats[t.type] += t.amount;
          stats.total += t.amount;
        }
      });

      return stats;
    });
  }, [transactions, currentDate]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 border border-slate-100 rounded-2xl shadow-xl text-right">
            <p className="text-slate-800 font-bold mb-2 border-b border-slate-100 pb-2">{dataPoint.fullDate}</p>
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-end gap-2 mb-1 last:mb-0">
                    <span className="font-mono font-medium text-slate-700">
                        {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(entry.value)}
                    </span>
                    <span className="text-sm text-slate-500">{entry.name}:</span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                </div>
            ))}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                 <span className="font-mono font-bold text-slate-900">
                    {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(dataPoint.total)}
                 </span>
                 <span className="text-sm font-medium text-slate-600">סה״כ:</span>
            </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 mb-8 overflow-hidden relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <BarChart3 size={24} />
        </div>
        <div>
            <h3 className="font-bold text-slate-800 text-lg">מגמת הכנסות</h3>
            <p className="text-sm text-slate-400">6 חודשים אחרונים</p>
        </div>
      </div>

      <div className="h-[300px] w-full relative">
        <AnimatePresence mode="wait">
            {isLoading ? (
                <MotionDiv 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-end justify-between px-2 md:px-6 pb-6"
                >
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div 
                            key={i} 
                            className="w-8 md:w-12 bg-slate-100 rounded-t-lg relative overflow-hidden"
                            style={{ height: `${Math.max(25, Math.random() * 75)}%` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer transform skew-x-12"></div>
                        </div>
                    ))}
                </MotionDiv>
            ) : (
                <MotionDiv 
                    key="chart"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="h-full w-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        barSize={32}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(value) => `₪${value / 1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Legend 
                            iconType="circle" 
                            wrapperStyle={{ paddingTop: '20px' }} 
                            formatter={(value) => <span className="text-slate-600 text-sm font-medium mx-2">{value}</span>}
                        />
                        
                        {/* Stacked Bars */}
                        <Bar 
                            dataKey={IncomeType.BANK} 
                            name={CATEGORIES[IncomeType.BANK].label} 
                            stackId="a" 
                            fill={CATEGORIES[IncomeType.BANK].color} 
                            radius={[0, 0, 4, 4]}
                        />
                        <Bar 
                            dataKey={IncomeType.BIT} 
                            name={CATEGORIES[IncomeType.BIT].label} 
                            stackId="a" 
                            fill={CATEGORIES[IncomeType.BIT].color} 
                        />
                        <Bar 
                            dataKey={IncomeType.CASH} 
                            name={CATEGORIES[IncomeType.CASH].label} 
                            stackId="a" 
                            fill={CATEGORIES[IncomeType.CASH].color} 
                            radius={[4, 4, 0, 0]} 
                        />
                    </BarChart>
                    </ResponsiveContainer>
                </MotionDiv>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
};