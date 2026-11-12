export interface IncomeRow {
  id: string;
  amount: number;
  type: string;
  date: string;
  description?: string;
  created_at: string;
  read_only?: boolean;
  employer?: string | null;
  month_override?: boolean;
}
export interface MonthOverride {
  person: string;
  month: string;
  cash: number;
  bit: number;
  bank: number;
  updated_at: string;
}

export function applyMonthlyOverrides(
  rows: IncomeRow[],
  overrides: MonthOverride[],
) {
  const result = rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    type: row.type.toLowerCase(),
  }));
  const totals = new Map<string, number>();
  result.forEach((row) => {
    const key = `${row.date.slice(0, 7)}:${row.type}`;
    totals.set(key, (totals.get(key) ?? 0) + Math.round(row.amount * 100));
  });
  overrides.forEach((override) => {
    for (const category of ["cash", "bit", "bank"] as const) {
      const key = `${override.month.slice(0, 7)}:${category}`;
      const difference =
        Math.round(Number(override[category]) * 100) - (totals.get(key) ?? 0);
      if (!difference) continue;
      result.push({
        id: `override-${key}`,
        amount: difference / 100,
        type: category,
        date: override.month,
        description: "התאמה לסכום חודשי שנקבע ידנית",
        created_at: override.updated_at,
        read_only: true,
        month_override: true,
      });
    }
  });
  return result;
}
