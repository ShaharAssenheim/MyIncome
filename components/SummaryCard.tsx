import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { MonthlyStats, IncomeType } from '../types';
import { CATEGORIES } from '../constants';
import { TrendingUp, Wallet } from 'lucide-react';

interface SummaryCardProps {
  stats: MonthlyStats;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ stats }) => {
  const data = useMemo(() => {
    return [
      { name: CATEGORIES[IncomeType.CASH].label, value: stats.cash, color: CATEGORIES[IncomeType.CASH].color },
      { name: CATEGORIES[IncomeType.BIT].label, value: stats.bit, color: CATEGORIES[IncomeType.BIT].color },
      { name: CATEGORIES[IncomeType.BANK].label, value: stats.bank, color: CATEGORIES[IncomeType.BANK].color },
    ].filter(d => d.value > 0);
  }, [stats]);

  const formattedTotal = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(stats.total);

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-10 mb-8 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/20 group">
      {/* Dynamic Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-slate-900 z-0"></div>
      
      {/* Abstract Shapes */}
      <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none mix-blend-screen animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none mix-blend-screen"></div>
      
      {/* Glass overlay effect */}
      <div className="absolute inset-0 bg-white/[0.03] border border-white/10 rounded-[2.5rem] z-10"></div>

      <div className="relative z-20 flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Text Section */}
        <div className="flex-1 text-center md:text-right">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-indigo-100 text-sm font-medium mb-4 backdrop-blur-md shadow-sm">
            <TrendingUp size={16} className="text-emerald-400" />
            <span>סה״כ הכנסות החודש</span>
          </div>
          
          <div className="relative">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-indigo-200 drop-shadow-lg py-2">
              {formattedTotal}
            </h1>
          </div>
          
          <div className="mt-6 flex items-center justify-center md:justify-start gap-6 text-sm text-slate-400 font-medium">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse"></div>
              <span className="text-slate-300">פעיל</span>
            </div>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="text-slate-500">מתעדכן בזמן אמת</span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="w-56 h-56 md:w-64 md:h-64 relative flex-shrink-0">
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        className="stroke-slate-900 stroke-[3px] shadow-lg"
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(value)}
                    contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', 
                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                        color: '#0f172a',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center border-4 border-slate-700/30 border-dashed rounded-full">
                <Wallet className="text-slate-600/50 w-16 h-16" />
              </div>
            )}
            
            {/* Center Text in Pie */}
            {stats.total > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">התפלגות</span>
                </div>
            )}
        </div>
      </div>

      {/* Legend Strip */}
      {stats.total > 0 && (
          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 relative z-20">
            {data.map(item => (
              <div key={item.name} className="flex flex-col items-center md:items-start transition-transform hover:scale-105">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-3 h-3 rounded-full ring-2 ring-white/10 ring-offset-2 ring-offset-slate-900" style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}60` }}></div>
                  <span className="text-slate-300 text-xs md:text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-white font-bold text-lg md:text-xl tracking-tight">
                  {((item.value / stats.total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
      )}
    </div>
  );
};