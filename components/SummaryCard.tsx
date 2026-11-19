"use client";
import { TrendingUp, Wallet } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useMemo } from "react";
import { CATEGORIES } from "../constants";
import { IncomeType, MonthlyStats } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
const SummaryPie = dynamic(
  () => import("./SummaryPie.tsx").then((module) => module.SummaryPie),
  { ssr: false },
);

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
    <Card
      tone="hero"
      className="income-hero gap-0"
      aria-label="סיכום הכנסות החודש"
    >
      <CardHeader>
        <CardTitle>
          <span className="flex items-center gap-2 text-hero-foreground/90">
            <TrendingUp size={16} />
            סך ההכנסות החודש
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="hero-total">{formattedTotal}</p>
            <p className="mt-5 text-xs text-hero-foreground/90">
              מזומן, Bit והעברות בנקאיות
            </p>
          </div>
          <div
            className="relative hidden size-40 shrink-0 sm:block"
            aria-hidden="true"
          >
            {stats.total > 0 ? (
              <>
                <SummaryPie data={data} />
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-hero-foreground/90">
                  התפלגות
                </span>
              </>
            ) : (
              <div className="flex size-full items-center justify-center rounded-full border-[14px] border-white/10">
                <Wallet size={26} />
              </div>
            )}
          </div>
        </div>
        {stats.total > 0 && (
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/10 pt-5">
            {data.map((item) => (
              <li
                key={item.name}
                className="flex items-center gap-2 text-[11px] text-hero-foreground/90"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
                <span className="ui-number font-medium text-hero-foreground">
                  {((item.value / stats.total) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
