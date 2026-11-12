import admin from "./supabase/admin";
import { readIncome } from "./income-server";
import { FinanceData } from "./finance";
import { unstable_cache } from "next/cache";
async function readFinanceOverview(): Promise<FinanceData> {
  const [datasets, imports, bankYears, bankMonths, kristin, shahar] =
    await Promise.all([
      admin
        .from("finance_datasets")
        .select("kind,payload")
        .order("imported_at", { ascending: false }),
      admin
        .from("bank_imports")
        .select("*")
        .order("imported_at", { ascending: false }),
      admin.from("bank_yearly_summary").select("*").order("year"),
      admin.from("bank_monthly_closing").select("month,balance").order("month"),
      readIncome("kristin"),
      readIncome("shahar"),
    ]);
  if (datasets.error || imports.error || bankYears.error || bankMonths.error)
    throw new Error(
      datasets.error?.message ??
        imports.error?.message ??
        bankYears.error?.message ??
        bankMonths.error?.message,
    );

  return {
    savings:
      datasets.data.find((row) => row.kind === "savings")?.payload ?? null,
    sourceMonths:
      datasets.data.find((row) => row.kind === "source_months")?.payload ??
      null,
    imports: imports.data,
    bankYears: bankYears.data,
    bankMonths: bankMonths.data,
    income: { kristin: kristin.rows, shahar: shahar.rows },
  };
}

export const loadFinanceOverview = unstable_cache(
  readFinanceOverview,
  ["finance-overview-v2"],
  { revalidate: 30, tags: ["finance-data"] },
);
