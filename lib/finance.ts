export interface SavingsMonth {
  period: string;
  year: number;
  month: number;
  date: string;
  cash: number;
  deposit: number;
  harel: number;
  ayalon: number;
  stocks: number;
  total: number;
  change: number | null;
  status: string;
}
export interface SavingsData {
  asOf: string;
  cashAsOf: string;
  portfolioAsOf: string;
  cash: number;
  portfolio: number;
  profitShownInPortfolio: number;
  monthly: SavingsMonth[];
  holdings: { name: string; value: number; color: string }[];
  events: {
    date: string;
    category: string;
    title: string;
    amount: number;
    detail: string;
  }[];
  notes: string[];
  sources: string[];
}
export interface CashClosing {
  month: string;
  balance: number;
  date: string;
}
export interface FinanceData {
  bankMonths: CashClosing[];
  bankYears: {
    year: number;
    balance: number;
    date: string;
  }[];
  income: {
    kristin: import("./income").IncomeRow[];
    shahar: import("./income").IncomeRow[];
  };
  savings: SavingsData | null;
  sourceMonths: { months: [string, number][] } | null;
}

export function bankSummaries(closings: CashClosing[]) {
  const bankMonths = [...closings].sort((a, b) => a.month.localeCompare(b.month));
  const years = new Map<number, { year: number; balance: number; date: string }>();
  for (const row of bankMonths) {
    const year = Number(row.month.slice(0, 4));
    const existing = years.get(year);
    if (!existing || row.date >= existing.date) years.set(year, { year, balance: Number(row.balance), date: row.date });
  }
  return { bankMonths, bankYears: [...years.values()].sort((a, b) => a.year - b.year) };
}

export function familyPortfolio(data: Pick<FinanceData, "savings" | "bankYears">) {
  const cashCandidates = data.bankYears.map((row) => ({
    value: Number(row.balance),
    date: row.date,
  }));
  if (data.savings) cashCandidates.push({
    value: Number(data.savings.cash),
    date: data.savings.cashAsOf,
  });
  const cash = cashCandidates
    .filter((row) => row.date && Number.isFinite(row.value))
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const holdings = (data.savings?.holdings ?? [])
    .filter((item) => item.value > 0)
    .map((item) => ({ name: item.name, value: Number(item.value) }));
  if (cash) holdings.push({ name: "עו״ש", value: cash.value });
  return { holdings, cash };
}

export const money = (amount: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);

export function compareSavingsMonths(months: SavingsMonth[], fromPeriod: string, toPeriod: string) {
  const from = months.find((month) => month.period === fromPeriod);
  const to = months.find((month) => month.period === toPeriod);
  if (!from || !to || from.period > to.period || !Number.isFinite(from.total) || !Number.isFinite(to.total)) return null;
  // Use the original reported totals and subtract in cents, preserving historical rounding.
  const fromCents = Math.round(from.total * 100);
  const differenceCents = Math.round(to.total * 100) - fromCents;
  return { from, to, difference: differenceCents / 100,
    percentage: fromCents > 0 ? differenceCents / fromCents * 100 : null };
}
