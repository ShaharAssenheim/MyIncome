export type IncomePerson = "shahar" | "kristin";
export const incomeTable = (person: IncomePerson) => person === "shahar" ? "shahar_income" : "kristin_income";

export interface IncomeRow {
  id: string;
  amount: number;
  type: string;
  date: string;
  payment_date?: string;
  description?: string;
  created_at: string;
  read_only?: boolean;
  employer?: string | null;
  month_override?: boolean;
  is_salary?: boolean;
}
export interface MonthOverride {
  person: string;
  month: string;
  cash: number;
  bit: number;
  bank: number;
  updated_at: string;
}

export interface IncomeRecord {
  id: string;
  income_date: string;
  payment_date: string | null;
  amount: number;
  payment_method: string;
  is_salary: boolean;
  description: string | null;
  employer: string | null;
  created_at: string;
}

export function incomeRecordToRow(row: IncomeRecord, person: "shahar" | "kristin"): IncomeRow {
  return {
    id: `${person === "shahar" && row.is_salary ? "salary" : person}-${row.id}`,
    date: row.income_date, payment_date: row.payment_date ?? undefined,
    amount: Number(row.amount), type: row.payment_method,
    description: row.description ?? undefined, employer: row.employer,
    created_at: row.created_at, is_salary: row.is_salary,
  };
}

// Start from Shahar's dedicated payroll records, not general bank transfers.
// An explicitly edited bank month replaces that month's payroll total, including
// an edit to zero. Kristin's income comes from her personal income ledger.
export function personalSalaryRows(
  rows: IncomeRow[],
  person: "shahar" | "kristin",
  year = "all",
) {
  const selected = rows.filter(
    (row) => year === "all" || row.date.startsWith(`${year}-`),
  );
  if (person === "kristin") return selected;

  const overrides = new Map<string, IncomeRow>();
  const bankTotals = new Map<string, number>();
  for (const row of selected) {
    if (row.type.toLowerCase() !== "bank") continue;
    const period = row.date.slice(0, 7);
    bankTotals.set(
      period,
      (bankTotals.get(period) ?? 0) + Math.round(Number(row.amount) * 100),
    );
    if (row.month_override) overrides.set(period, row);
  }

  return [
    ...selected.filter(
      (row) => (row.is_salary || row.id.startsWith("salary-")) && !overrides.has(row.date.slice(0, 7)),
    ),
    ...[...overrides].map(([period, row]) => ({
      ...row,
      // The ledger adjustment is a difference, so use the final edited total.
      amount: bankTotals.get(period)! / 100,
    })),
  ];
}

export function personalSalarySummary(
  income: { kristin: IncomeRow[]; shahar: IncomeRow[] },
  year = "all",
) {
  const totals = { kristin: 0, shahar: 0 };
  const ranges: Record<
    "kristin" | "shahar",
    { from: string; to: string } | null
  > = { kristin: null, shahar: null };
  const months = new Map<
    string,
    { period: string; kristin: number; shahar: number }
  >();
  for (const person of ["kristin", "shahar"] as const) {
    for (const row of personalSalaryRows(income[person], person, year)) {
      const cents = Math.round(Number(row.amount) * 100);
      totals[person] += cents;
      const period = row.date.slice(0, 7);
      const month = months.get(period) ?? { period, kristin: 0, shahar: 0 };
      month[person] += cents;
      months.set(period, month);
    }
  }
  const monthly = [...months.values()]
    .sort((a, b) => a.period.localeCompare(b.period))
    .filter((month) => month.kristin !== 0 || month.shahar !== 0);
  for (const person of ["kristin", "shahar"] as const) {
    const populated = monthly.filter((month) => month[person] !== 0);
    ranges[person] = populated.length
      ? { from: populated[0].period, to: populated[populated.length - 1].period }
      : null;
  }
  return {
    totals: { kristin: totals.kristin / 100, shahar: totals.shahar / 100 },
    ranges,
    months: monthly.map((month) => ({
      period: month.period,
      kristin: month.kristin / 100,
      shahar: month.shahar / 100,
    })),
  };
}

export function combinedSalaryTimeline(
  months: { period: string; kristin: number; shahar: number }[],
  year: string,
  currentPeriod: string,
) {
  const selected = months.filter((month) => year === "all" || month.period.startsWith(`${year}-`));
  const totals = new Map(selected.map((month) => [
    month.period,
    {
      total: Math.round(month.kristin * 100) + Math.round(month.shahar * 100),
      kristin: Math.round(month.kristin * 100),
      shahar: Math.round(month.shahar * 100),
    },
  ]));
  const years = year === "all"
    ? [...new Set(selected.map((month) => month.period.slice(0, 4)))].sort()
    : [year];

  return years.flatMap((salaryYear) => {
    const recorded = [...totals].filter(([period]) => period.startsWith(`${salaryYear}-`) && period < currentPeriod);
    // Average only completed months with data; retain current/future data in the chart.
    const annualAverage = recorded.length
      ? Math.round(recorded.reduce((sum, [, cents]) => sum + cents.total, 0) / recorded.length) / 100
      : null;
    return Array.from({ length: 12 }, (_, index) => {
      const period = `${salaryYear}-${String(index + 1).padStart(2, "0")}`;
      const cents = totals.get(period);
      return {
        period,
        total: cents === undefined ? null : cents.total / 100,
        kristin: cents === undefined ? null : cents.kristin / 100,
        shahar: cents === undefined ? null : cents.shahar / 100,
        annualAverage,
      };
    });
  });
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
