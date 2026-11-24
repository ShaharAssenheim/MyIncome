export type RetirementPerson = "shahar" | "kristin";
export type RetirementProduct = "pension" | "study_fund";
export interface RetirementAccount {
  id: string;
  person: RetirementPerson;
  product: RetirementProduct;
  provider: string;
  name: string;
  fund_type: "comprehensive" | "supplementary" | "study_fund";
  joined_on: string | null;
  notes: string[];
}
export const retirementAmounts = [
  "opening_balance", "closing_balance", "employee_contributions", "employer_contributions",
  "severance_contributions", "contributions_total", "investment_gains", "transfers_in", "transfers_out",
  "management_fees", "fee_refunds", "disability_cost", "survivor_cost", "actuarial_adjustment", "balance_adjustment",
] as const;
export type RetirementAmounts = Record<typeof retirementAmounts[number], number>;
export type RetirementReport = RetirementAmounts & {
  id: string;
  account_id: string;
  period_start: string;
  period_end: string;
  report_kind: "annual" | "ytd";
  reported_precision: 0 | 2;
  source_file: string;
  source_pages: number[];
  notes: string[];
};
export interface RetirementData {
  accounts: RetirementAccount[];
  reports: RetirementReport[];
}
export const retirementPersonNames = { shahar: "שחר", kristin: "קריסטין" } as const;
export const retirementProductNames = { pension: "פנסיה", study_fund: "קרן השתלמות" } as const;
const sum = (values: number[]) => values.reduce((cents, n) => cents + Math.round(n * 100), 0) / 100;

export function retirementRecords(accounts: RetirementAccount[], rows: Record<string, unknown>[]): RetirementData {
  const reports = rows.map((row) => {
    const result = { ...row } as RetirementReport;
    for (const field of retirementAmounts) {
      if (row[field] === null || row[field] === undefined || row[field] === "" || !Number.isFinite(Number(row[field]))) {
        throw new Error(`Invalid retirement amount: ${field}`);
      }
      result[field] = Number(row[field]);
    }
    if (!accounts.some((account) => account.id === result.account_id)) throw new Error("Retirement account missing");
    return result;
  });
  return { accounts, reports };
}

// A later YTD/annual statement replaces earlier statements for the same account/year.
// YTD flows already include earlier quarters, so summing those reports counts money twice.
export function canonicalRetirementReports(reports: RetirementReport[]) {
  const latest = new Map<string, RetirementReport>();
  for (const report of reports) {
    const key = `${report.account_id}:${report.period_start.slice(0, 4)}`;
    const previous = latest.get(key);
    if (!previous || report.period_end > previous.period_end ||
      (report.period_end === previous.period_end && report.report_kind === "annual")) latest.set(key, report);
  }
  return [...latest.values()].sort((a, b) => a.period_end.localeCompare(b.period_end) || a.account_id.localeCompare(b.account_id));
}

export function retirementSummary(data: RetirementData, product: RetirementProduct, person?: RetirementPerson) {
  const accounts = data.accounts.filter((account) => account.product === product && (!person || account.person === person));
  const latest = accounts.map((account) => ({ account, report: data.reports
    .filter((r) => r.account_id === account.id).sort((a, b) => b.period_end.localeCompare(a.period_end))[0] }));
  const reported = latest.filter((entry) => entry.report);
  const active = reported.filter((entry) => entry.report.closing_balance !== 0);
  const dates = [...new Set((active.length ? active : reported).map((entry) => entry.report.period_end))].sort();
  return {
    balance: reported.length ? sum(reported.map((entry) => entry.report.closing_balance)) : null,
    dates,
    accounts: latest,
    missingPeople: (person ? [person] : ["shahar", "kristin"] as RetirementPerson[])
      .filter((p) => !reported.some((entry) => entry.account.person === p)),
    missingAccounts: latest.filter((entry) => !entry.report).map((entry) => entry.account.name),
    rounded: active.some((entry) => entry.report.reported_precision === 0),
  };
}

export function retirementYears(data: RetirementData, person: RetirementPerson, product: RetirementProduct) {
  const accounts = data.accounts.filter((account) => account.person === person && account.product === product);
  const reports = canonicalRetirementReports(data.reports.filter((r) => accounts.some((a) => a.id === r.account_id)));
  return [...new Set(reports.map((r) => r.period_start.slice(0, 4)))].sort().map((year) => {
    const rows = reports.filter((r) => r.period_start.startsWith(year));
    const totals = Object.fromEntries(retirementAmounts.map((field) => [field, sum(rows.map((r) => r[field]))])) as RetirementAmounts;
    const dates = [...new Set(rows.map((r) => r.period_end))].sort();
    // A missing report is unknown, except for accounts whose last documented balance was zero.
    const missingAccounts = accounts.filter((account) => {
      if (account.joined_on && account.joined_on > dates.at(-1)!) return false;
      if (rows.some((r) => r.account_id === account.id)) return false;
      const previous = reports.filter((r) => r.account_id === account.id && r.period_end < year + "-01-01").at(-1);
      return !previous || previous.closing_balance !== 0;
    }).map((a) => a.name);
    const netGrowth = sum([totals.investment_gains, -totals.management_fees, totals.fee_refunds,
      -totals.disability_cost, -totals.survivor_cost, totals.actuarial_adjustment]);
    return { year, ...totals, dates, reports: rows, missingAccounts, netGrowth,
      partial: rows.some((r) => r.report_kind !== "annual"), rounded: rows.some((r) => r.reported_precision === 0) };
  });
}

export function retirementReconciliation(report: RetirementReport) {
  const calculated = sum([report.opening_balance, report.balance_adjustment, report.contributions_total,
    report.transfers_in, -report.transfers_out, report.investment_gains, -report.management_fees,
    report.fee_refunds, -report.disability_cost, -report.survivor_cost, report.actuarial_adjustment]);
  return { calculated, difference: sum([report.closing_balance, -calculated]), tolerance: report.reported_precision === 0 ? 7 : 0.05 };
}
