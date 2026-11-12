"use client";
import React, { useMemo } from "react";
import dynamic from "next/dynamic";
const SummaryPie = dynamic(
  () => import("./SummaryPie.tsx").then((module) => module.SummaryPie),
  { ssr: false },
);
import { MonthlyStats, IncomeType } from "../types";
import { CATEGORIES } from "../constants";
import { TrendingUp, Wallet } from "lucide-react";

interface SummaryCardProps {
  stats: MonthlyStats;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ stats }) => {
  const data = useMemo(() => {
    return [
      {
        name: CATEGORIES[IncomeType.CASH].label,
        value: stats.cash,
        color: CATEGORIES[IncomeType.CASH].color,
      },
      {
        name: CATEGORIES[IncomeType.BIT].label,
        value: stats.bit,
        color: CATEGORIES[IncomeType.BIT].color,
      },
      {
        name: CATEGORIES[IncomeType.BANK].label,
        value: stats.bank,
        color: CATEGORIES[IncomeType.BANK].color,
      },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const formattedTotal = new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(stats.total);

  return (
    <section className="ui-income-summary mb-5" aria-label="סיכום הכנסות החודש">
      <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="w-full sm:w-auto">
          <p className="mb-4 flex items-center gap-2 text-sm text-indigo-200">
            <TrendingUp size={17} aria-hidden="true" />
            סך ההכנסות החודש
          </p>
          <p className="ui-income-summary-total">{formattedTotal}</p>
          <p className="mt-4 text-xs text-slate-300">
            מזומן, Bit והעברות בנקאיות
          </p>
        </div>
        <div className="relative h-40 w-40 shrink-0" aria-hidden="true">
          {stats.total > 0 ? (
            <>
              <SummaryPie data={data} />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-300">
                התפלגות
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-full border-[14px] border-white/10">
              <Wallet size={26} className="text-slate-400" />
            </div>
          )}
        </div>
      </div>
      {stats.total > 0 && (
        <ul className="mt-6 flex flex-wrap gap-x-7 gap-y-3 border-t border-white/10 pt-5">
          {data.map((item) => (
            <li
              key={item.name}
              className="flex items-center gap-2 text-xs text-slate-300"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
              <span className="ui-number font-semibold text-white">
                {((item.value / stats.total) * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
