const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");
const retirement = {};
runInNewContext(ts.transpileModule(readFileSync(resolve(__dirname, "../lib/retirement.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: retirement });
const { retirementAmounts, retirementSummary, retirementYears, retirementRecords, retirementReconciliation } = retirement;
const account = (id, person = "shahar", product = "pension", joined_on = "2020-01-01") => ({ id, person, product, provider: id, name: id, joined_on, notes: [], fund_type: product === "pension" ? "comprehensive" : "study_fund" });
const report = (account_id, fields = {}) => ({ ...Object.fromEntries(retirementAmounts.map((field) => [field, 0])),
  id: account_id + "-2025", account_id, period_start: "2025-01-01", period_end: "2025-12-31", report_kind: "annual", reported_precision: 2,
  source_file: "statement.pdf", source_pages: [2], notes: [], ...fields });

test("retirement totals keep people and products separate, with missing data distinct from zero", () => {
  const data = { accounts: [account("a"), account("b", "kristin"), account("c", "shahar", "study_fund")],
    reports: [report("a", { closing_balance: 100.10 }), report("b", { closing_balance: 200.20 })] };
  assert.equal(retirementSummary(data, "pension").balance, 300.30);
  assert.equal(retirementSummary(data, "pension", "shahar").balance, 100.10);
  assert.equal(retirementSummary(data, "study_fund").balance, null);
  assert.equal(retirementSummary(data, "pension", "kristin").missingPeople.length, 0);
  data.reports.pop();
  assert.equal(retirementSummary(data, "pension", "kristin").balance, null);
  data.reports.push(report("b"));
  assert.equal(retirementSummary(data, "pension", "kristin").balance, 0);
});
test("YTD flows replace earlier quarters and annual reports replace YTD without double counting", () => {
  const data = { accounts: [account("a")], reports: [
    report("a", { period_end: "2025-03-31", report_kind: "ytd", contributions_total: 20, closing_balance: 20 }),
    report("a", { period_end: "2025-09-30", report_kind: "ytd", contributions_total: 70, closing_balance: 70 }),
    report("a", { contributions_total: 100, closing_balance: 100 }),
  ] };
  const years = retirementYears(data, "shahar", "pension");
  assert.equal(years.length, 1); assert.equal(years[0].contributions_total, 100);
  assert.equal(years[0].partial, false); assert.equal(years[0].closing_balance, 100);
});
test("a transfer between providers is neither a deposit nor investment profit", () => {
  const data = { accounts: [account("old"), account("new", "shahar", "pension", "2025-02-01")], reports: [
    report("old", { opening_balance: 1000, transfers_out: 1000 }),
    report("new", { transfers_in: 1000, contributions_total: 200, investment_gains: 30, management_fees: 5, closing_balance: 1225 }),
  ] };
  const row = retirementYears(data, "shahar", "pension")[0];
  assert.equal(row.transfers_in - row.transfers_out, 0);
  assert.equal(row.contributions_total, 200); assert.equal(row.investment_gains, 30); assert.equal(row.netGrowth, 25);
  assert.equal(retirementSummary(data, "pension").balance, 1225);
});
test("mixed dates, absent annual statements and partial years stay visible", () => {
  const data = { accounts: [account("a"), account("b")], reports: [
    report("a", { closing_balance: 100 }),
    report("b", { period_start: "2024-01-01", period_end: "2024-12-31", closing_balance: 20 }),
  ] };
  const summary = retirementSummary(data, "pension");
  assert.equal(summary.dates.length, 2);
  const years = retirementYears(data, "shahar", "pension");
  assert.equal(years.at(-1).missingAccounts[0], "b");
  data.reports[1].closing_balance = 0;
  assert.equal(retirementYears(data, "shahar", "pension").at(-1).missingAccounts.length, 0);
});
test("statement reconciliation preserves adjustments and rounded reported totals", () => {
  const r = report("a", { opening_balance: 1000, balance_adjustment: -2.10, employee_contributions: 20,
    employer_contributions: 30, severance_contributions: 50, contributions_total: 100,
    investment_gains: -5, management_fees: 3, fee_refunds: 1, disability_cost: 2, survivor_cost: 1,
    actuarial_adjustment: .10, closing_balance: 1088 });
  assert.equal(retirementReconciliation(r).difference, 0);
  r.reported_precision = 0; r.contributions_total = 99;
  assert.equal(retirementReconciliation(r).difference, 1);
  assert.ok(retirementReconciliation(r).tolerance >= 1);
  assert.equal(r.employee_contributions + r.employer_contributions + r.severance_contributions, 100);
});
test("numeric statement strings are parsed while unknown, invalid and orphaned values fail", () => {
  assert.equal(retirementRecords([account("a")], [report("a", { closing_balance: "1.25" })]).reports[0].closing_balance, 1.25);
  for (const invalid of [null, "", undefined, "NaN", Infinity]) assert.throws(() => retirementRecords([account("a")], [report("a", { closing_balance: invalid })]), /Invalid retirement/);
  assert.throws(() => retirementRecords([], [report("a")]), /account missing/);
});
