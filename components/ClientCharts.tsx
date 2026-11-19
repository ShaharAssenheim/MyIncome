"use client";
import { Skeleton } from "@/components/ui/skeleton";

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
      onYearChange: (year: number) => void;
    }>;
  },
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-2xl border border-border bg-card p-6"
        role="status"
        aria-label="טוען מגמת הכנסות"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent rounded-xl w-10 h-10" />
          <div>
            <Skeleton className="h-5 w-32 bg-muted  rounded"></Skeleton>
            <Skeleton className="h-4 w-24 bg-muted  rounded mt-1"></Skeleton>
          </div>
        </div>
        <Skeleton className="h-[300px] w-full bg-muted  rounded-xl"></Skeleton>
      </div>
    ),
  },
);
