import type { CashClosing, SavingsData } from "./finance";

export interface FinanceRecords {
  settings: { snapshot_date: string; profit_shown_in_portfolio: number; notes: string[]; sources: string[] };
  cash: { balance_month: string; balance_date: string | null; balance: number | null; reference_balance: number | null }[];
  assets: { asset_key: string; name: string; display_color: string; display_order: number; current_value: number | null; valuation_date: string | null }[];
  snapshots: { snapshot_month: string; snapshot_date: string; cash_balance: number; reported_total: number; quality: string; assets: { asset_key: string; value: number }[] }[];
  events: { event_date: string; category: string; title: string; amount: number; description: string; display_order: number }[];
}

export function financeRecordsToData(records: FinanceRecords) {
  const bankMonths: CashClosing[] = records.cash.filter((row) => row.balance !== null && row.balance_date !== null)
    .map((row) => ({ month: row.balance_month, balance: Number(row.balance), date: row.balance_date! }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const latestCash = [...bankMonths].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latestCash) throw new Error("No reported cash balance is available");
  const holdings = records.assets.filter((row) => row.current_value !== null && row.valuation_date !== null)
    .sort((a, b) => a.display_order - b.display_order || a.asset_key.localeCompare(b.asset_key));
  const snapshots = [...records.snapshots].sort((a, b) => a.snapshot_month.localeCompare(b.snapshot_month));
  const savings: SavingsData = {
    asOf: records.settings.snapshot_date,
    cashAsOf: latestCash.date,
    cash: latestCash.balance,
    portfolioAsOf: holdings.map((row) => row.valuation_date!).sort().at(-1) ?? records.settings.snapshot_date,
    portfolio: holdings.reduce((sum, row) => sum + Math.round(Number(row.current_value) * 100), 0) / 100,
    profitShownInPortfolio: Number(records.settings.profit_shown_in_portfolio),
    monthly: snapshots.map((row, index) => {
      const assets = new Map(row.assets.map((asset) => [asset.asset_key, Number(asset.value)]));
      return {
        period: row.snapshot_month.slice(0, 7), year: Number(row.snapshot_month.slice(0, 4)), month: Number(row.snapshot_month.slice(5, 7)),
        date: row.snapshot_date, cash: Number(row.cash_balance), deposit: assets.get("bank_deposit") ?? 0,
        harel: assets.get("harel_money_market") ?? 0, ayalon: assets.get("ayalon_money_market") ?? 0, stocks: assets.get("bank_hapoalim_shares") ?? 0,
        total: Number(row.reported_total), status: row.quality,
        change: index ? (Math.round(Number(row.reported_total) * 100) - Math.round(Number(snapshots[index - 1].reported_total) * 100)) / 100 : null,
      };
    }),
    holdings: holdings.map((row) => ({ name: row.name, value: Number(row.current_value), color: row.display_color })),
    events: [...records.events].sort((a, b) => a.display_order - b.display_order).map((row) => ({
      date: row.event_date, category: row.category, title: row.title, amount: Number(row.amount), detail: row.description,
    })),
    notes: records.settings.notes,
    sources: records.settings.sources,
  };
  return { savings, bankMonths, sourceMonths: { months: records.cash.filter((row) => row.reference_balance !== null)
    .sort((a, b) => a.balance_month.localeCompare(b.balance_month))
    .map((row) => [row.balance_month.slice(0, 7), Number(row.reference_balance)] as [string, number]) } };
}
