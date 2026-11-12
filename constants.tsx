import { Landmark, Smartphone, Wallet } from "lucide-react";
import { CategoryConfig, IncomeType } from "./types";

export const CATEGORIES: Record<IncomeType, CategoryConfig> = {
  [IncomeType.CASH]: {
    id: IncomeType.CASH,
    label: "מזומן",
    color: "var(--chart-1)",
    bgStart: "from-emerald-50",
    bgEnd: "to-emerald-100/50",
    textColor: "text-emerald-900",
    iconColor: "text-emerald-600",
  },
  [IncomeType.BIT]: {
    id: IncomeType.BIT,
    label: "ביט",
    color: "var(--chart-2)",
    bgStart: "from-sky-50",
    bgEnd: "to-sky-100/50",
    textColor: "text-sky-900",
    iconColor: "text-sky-600",
  },
  [IncomeType.BANK]: {
    id: IncomeType.BANK,
    label: "העברה בנקאית",
    color: "var(--chart-3)",
    bgStart: "from-violet-50",
    bgEnd: "to-violet-100/50",
    textColor: "text-violet-900",
    iconColor: "text-violet-600",
  },
};

export const getCategoryIcon = (type: IncomeType, size: number = 24) => {
  switch (type) {
    case IncomeType.CASH:
      return <Wallet size={size} />;
    case IncomeType.BIT:
      return <Smartphone size={size} />;
    case IncomeType.BANK:
      return <Landmark size={size} />;
  }
};
