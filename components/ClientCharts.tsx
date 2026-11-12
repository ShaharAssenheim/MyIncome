"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Transaction } from "../types";

/* ================= Summary Card ================= */

export { SummaryCard as DynamicSummaryCard } from "./SummaryCard";

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
      <div
        className="ui-panel mb-6"
        role="status"
        aria-label="טוען מגמת הכנסות"
      >
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
  },
);
