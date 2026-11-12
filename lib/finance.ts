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
  baseline2018Dec: number;
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
export interface BankTransaction {
  id: string;
  account_number: string;
  date: string;
  amount: number;
  balance: number;
  description: string;
  detail: string;
  is_salary: boolean;
  source_page: number;
  import_id: string;
  operation_code: number;
  reference: string;
  source_order: number;
}
export interface FinanceData {
  bankMonths: { month: string; balance: number }[];
  bankYears: {
    year: number;
    credits: number;
    debits: number;
    net: number;
    balance: number;
    date: string;
  }[];
  income: {
    kristin: import("./income").IncomeRow[];
    shahar: import("./income").IncomeRow[];
  };
  savings: SavingsData | null;
  sourceMonths: { months: [string, number][] } | null;
  imports: {
    id: string;
    filename: string;
    row_count: number;
    inserted_count: number;
    imported_at: string;
  }[];
}

export const money = (amount: number) =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  }).format(amount);
