"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { MonthlyStats, Transaction } from "../types";

/* ================= Summary Card ================= */

export const DynamicSummaryCard = dynamic(
  async () => {
    const mod = await import("./SummaryCard.tsx");
    return mod.SummaryCard as ComponentType<{ stats: MonthlyStats }>;
  },
  {
    ssr: false,
    loading: () => (
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 md:p-10 mb-8 bg-gradient-to-br from-slate-900 via-[#1e1b4b] to-slate-900">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex-1 text-center md:text-right">
            <div className="h-8 w-48 bg-slate-700/50 animate-pulse rounded-full mb-4" />
            <div className="h-16 w-64 bg-slate-700/50 animate-pulse rounded-xl" />
          </div>
          <div className="w-56 h-56 md:w-64 md:h-64 bg-slate-700/30 animate-pulse rounded-full" />
        </div>
      </div>
    ),
  }
);

/* ================= Trends Chart ================= */

export const DynamicTrendsChart = dynamic(
  async () => {
    const mod = await import("./TrendsChart.tsx");
    return mod.TrendsChart as ComponentType<{
      transactions: Transaction[];
      currentDate: Date;
    }>;
  },
  {
    ssr: false,
    loading: () => (
      <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-slate-100 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl w-10 h-10" />
          <div>
            <div className="h-5 w-32 bg-slate-200 animate-pulse rounded" />
            <div className="h-4 w-24 bg-slate-100 animate-pulse rounded mt-1" />
          </div>
        </div>
        <div className="h-[300px] w-full bg-slate-50 animate-pulse rounded-xl" />
      </div>
    ),
  }
);
