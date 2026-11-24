import { unstable_cache } from "next/cache";
import { readRows } from "./supabase/admin";
import { readIncome } from "./income-server";
import { bankSummaries, type FinanceData } from "./finance";
import { financeRecordsToData } from "./finance-records";

async function readFinanceOverview(): Promise<FinanceData> {
  const [cash, assets, snapshots, events, settings, kristin, shahar] = await Promise.all([
    readRows("cash_monthly_balances", ["balance_month"]),
    readRows("investment_assets", ["display_order", "asset_key"]),
    readRows("savings_monthly_snapshots", ["snapshot_month"], "*,assets:savings_snapshot_assets(asset_key,value)"),
    readRows("finance_events", ["display_order", "id"]),
    readRows("finance_settings"), readIncome("kristin"), readIncome("shahar"),
  ]);
  if (settings.length !== 1 || settings[0].schema_version !== 2) throw new Error("One finance settings row with schema version 2 is required");
  const overview = financeRecordsToData({ cash, assets, snapshots, events, settings: settings[0] });
  return { ...overview, ...bankSummaries(overview.bankMonths), income: { kristin: kristin.rows, shahar: shahar.rows } };
}

export const loadFinanceOverview = unstable_cache(readFinanceOverview, ["finance-overview-v8"], {
  revalidate: 30, tags: ["finance-data"],
});

export async function exportFinance() {
  const tables = {
    shaharIncome: ["shahar_income", ["income_date", "id"]],
    kristinIncome: ["kristin_income", ["income_date", "id"]],
    incomeMonthOverrides: ["income_month_overrides", ["person", "income_month"]],
    cashMonthlyBalances: ["cash_monthly_balances", ["balance_month"]],
    investmentAssets: ["investment_assets", ["asset_key"]],
    savingsMonthlySnapshots: ["savings_monthly_snapshots", ["snapshot_month"]],
    savingsSnapshotAssets: ["savings_snapshot_assets", ["snapshot_month", "asset_key"]],
    financeEvents: ["finance_events", ["display_order", "id"]],
    settings: ["finance_settings", ["id"]],
  } as const;
  const data = await Promise.all(Object.entries(tables).map(async ([key, [table, fields]]) =>
    [key, await readRows(table, [...fields])]));
  return { schemaVersion: 2, ...Object.fromEntries(data) };
}
