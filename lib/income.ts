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
}
export interface MonthOverride {
  person: string;
  month: string;
  cash: number;
  bit: number;
  bank: number;
  updated_at: string;
}

export interface SalaryRow {
  id: string;
  bank_transaction_id: string | null;
  payment_date: string;
  amount: number;
  employer: string | null;
  created_at: string;
}

// Derive the work month from the source receipt every time. Never shift a
// previously derived income date or change the bank transaction itself.
export function salaryIncomeDate(paymentDate: string, imported: boolean) {
  if (!imported) return paymentDate;
  const year = Number(paymentDate.slice(0, 4));
  const month = Number(paymentDate.slice(5, 7));
  const workYear = month === 1 ? year - 1 : year;
  const workMonth = month === 1 ? 12 : month - 1;
  return `${workYear}-${String(workMonth).padStart(2, "0")}-01`;
}

export function salaryToIncome(row: SalaryRow): IncomeRow {
  return {
    id: `salary-${row.id}`,
    date: salaryIncomeDate(row.payment_date, Boolean(row.bank_transaction_id)),
    payment_date: row.payment_date,
    amount: Number(row.amount),
    type: "bank",
    employer: row.employer,
    description: row.employer
      ? `משכורת · ${row.employer}`
      : "משכורת · המעסיק לא זוהה בדוח",
    created_at: row.created_at,
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
      (row) => row.id.startsWith("salary-") && !overrides.has(row.date.slice(0, 7)),
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
