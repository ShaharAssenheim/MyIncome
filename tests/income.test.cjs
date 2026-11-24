const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

// Compile the pure income module without adding a runtime test dependency.
const compiled = ts.transpileModule(
  readFileSync(resolve(__dirname, "../lib/income.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const income = {};
runInNewContext(compiled, { exports: income });
const { incomeRecordToRow, applyMonthlyOverrides, personalSalaryRows, personalSalarySummary, combinedSalaryTimeline } = income;

function payroll(income_date, id = "salary-source", amount = 1200, payment_date = null) {
  return incomeRecordToRow({ id, income_date, payment_date, amount, payment_method: "bank", is_salary: true,
    employer: "Example employer", description: "Salary", created_at: "2026-11-01T12:00:00Z" }, "shahar");
}

test("explicit work and payment dates survive repeated reads without shifting either date", () => {
  const row = payroll("2019-12-01", "source", 1200, "2020-01-31");
  assert.equal(row.date,"2019-12-01"); assert.equal(row.payment_date,"2020-01-31");
  assert.equal(row.id,"salary-source"); assert.equal(row.amount,1200);
  assert.deepEqual(payroll("2019-12-01", "source", 1200, "2020-01-31"),row);
});

test("October 2019 manual total remains exact using the explicitly stored work month", () => {
  const rows = [
    payroll("2019-10-01"),
    payroll("2019-11-01", "next-salary", 1500),
  ];
  const overrides = [
    {
      person: "shahar",
      month: "2019-10-01",
      cash: 0,
      bit: 0,
      bank: 1199,
      updated_at: "2026-11-01T00:00:00Z",
    },
  ];
  const result = applyMonthlyOverrides(rows, overrides);
  const total = (month) =>
    result
      .filter((row) => row.date.startsWith(month))
      .reduce((sum, row) => sum + row.amount, 0);
  assert.equal(total("2019-10"), 1199);
  assert.equal(total("2019-11"), 1500);
  assert.equal(
    result.filter((row) => row.id === "salary-salary-source").length,
    1,
  );
  assert.equal(overrides[0].bank, 1199);
});

test("manual dates and Kristin income remain in their selected months", () => {
  const manualSalary = payroll("2019-10-15");
  assert.equal(manualSalary.date, "2019-10-15");
  const manual = {
    id: "manual",
    date: "2020-01-05",
    amount: 200,
    type: "cash",
    created_at: "2020-01-05T12:00:00Z",
  };
  const result = applyMonthlyOverrides([manual], []);
  assert.equal(result[0].date, manual.date);
  assert.equal(result[0].amount, manual.amount);
});

test("multiple salary payments in one month retain every payment and their combined total", () => {
  const result = applyMonthlyOverrides(
    [
      payroll("2024-02-01", "first", 200),
      payroll("2024-02-01", "second", 300),
    ],
    [],
  );
  assert.equal(result.length, 2);
  assert.ok(result.every((row) => row.date === "2024-02-01"));
  assert.equal(
    result.reduce((sum, row) => sum + row.amount, 0),
    500,
  );
});

test("Shahar salary totals exclude general account transfers and other income", () => {
  const salaryRow = payroll("2024-02-01", "payroll", 1200);
  const rows = applyMonthlyOverrides([
    salaryRow,
    { id: "transfer", amount: 9000, type: "bank", date: "2024-02-02" },
    { id: "other-income", amount: 800, type: "cash", date: "2024-02-02" },
  ], []);
  const summary = personalSalarySummary({ shahar: rows, kristin: [] }, "2024");
  assert.equal(personalSalaryRows(rows, "shahar", "2024").length, 1);
  assert.equal(summary.totals.shahar, 1200);
  assert.equal(summary.ranges.shahar.from, "2024-02");
  assert.equal(summary.ranges.shahar.to, "2024-02");
  assert.equal(summary.ranges.kristin, null);
  assert.equal(summary.months[0].shahar, 1200);
  assert.equal(summary.totals.kristin, 0);
});

test("zeroed salary months move both ends of the range and do not contribute to totals", () => {
  const source = [
    payroll("2019-06-01", "june", 1200),
    payroll("2019-07-01", "july", 1600),
    payroll("2019-09-01", "september", 1400),
    payroll("2019-10-01", "october", 1800),
    payroll("2019-11-01", "november", 1900),
    payroll("2019-12-01", "december", 2000),
    { id: "transfer", type: "bank", date: "2019-06-01", amount: 9000 },
  ];
  const rows = applyMonthlyOverrides(source,
    ["2019-06-01", "2019-07-01", "2019-09-01", "2019-12-01"].map((month) => ({
      person: "shahar", month, cash: 0, bit: 0, bank: 0,
      updated_at: "2026-11-01T00:00:00Z",
    })),
  );
  const summary = personalSalarySummary({ shahar: rows, kristin: [] });
  assert.equal(summary.ranges.shahar.from, "2019-10");
  assert.equal(summary.ranges.shahar.to, "2019-11");
  assert.equal(summary.totals.shahar, 3700);
  assert.equal(summary.months.length, 2);
  assert.equal(source[0].amount, 1200);
});

test("edited salary totals replace the month rather than adding the adjustment as income", () => {
  const rows = applyMonthlyOverrides([
    payroll("2019-10-01", "first", 700),
    payroll("2019-10-01", "second", 500),
  ], [{
    person: "shahar", month: "2019-10-01", cash: 0, bit: 0, bank: 1199,
    updated_at: "2026-11-01T00:00:00Z",
  }]);
  const summary = personalSalarySummary({ shahar: rows, kristin: [] });
  assert.equal(summary.totals.shahar, 1199);
  assert.equal(summary.months[0].shahar, 1199);
  assert.equal(summary.ranges.shahar.from, "2019-10");
  assert.equal(summary.ranges.shahar.to, "2019-10");
});

test("empty and zero-valued monthly totals have no date range for either person", () => {
  const shahar = applyMonthlyOverrides([
    payroll("2024-02-01", "first", 1000),
    payroll("2024-03-01", "zero", 0),
  ], [{
    person: "shahar", month: "2024-02-01", cash: 0, bit: 0, bank: 0,
    updated_at: "2026-11-01T00:00:00Z",
  }]);
  const summary = personalSalarySummary({
    shahar,
    kristin: [
      { id: "credit", date: "2024-02-01", type: "bank", amount: 100 },
      { id: "correction", date: "2024-02-02", type: "bank", amount: -100 },
      { id: "zero", date: "2024-03-01", type: "cash", amount: 0 },
    ],
  });
  assert.equal(summary.totals.shahar, 0);
  assert.equal(summary.totals.kristin, 0);
  assert.equal(summary.ranges.shahar, null);
  assert.equal(summary.ranges.kristin, null);
  assert.equal(summary.months.length, 0);
});

test("each person's salary summary uses only their own records in the selected year", () => {
  const summary = personalSalarySummary({
    shahar: [
      payroll("2024-12-01", "december", 1500),
      payroll("2025-01-01", "january", 2000),
    ],
    kristin: [
      { id: "cash", date: "2024-12-05", type: "cash", amount: 100 },
      { id: "bit", date: "2024-12-06", type: "bit", amount: 200 },
      { id: "bank", date: "2024-12-07", type: "bank", amount: 300 },
      { id: "next-year", date: "2025-01-05", type: "bank", amount: 900 },
    ],
  }, "2024");
  assert.equal(summary.totals.shahar, 1500);
  assert.equal(summary.totals.kristin, 600);
  assert.equal(summary.ranges.shahar.from, "2024-12");
  assert.equal(summary.ranges.shahar.to, "2024-12");
  assert.equal(summary.ranges.kristin.from, "2024-12");
  assert.equal(summary.ranges.kristin.to, "2024-12");
  assert.equal(summary.months.length, 1);
  assert.equal(summary.months[0].period, "2024-12");
  assert.equal(summary.months[0].shahar, 1500);
  assert.equal(summary.months[0].kristin, 600);
});

test("salary summaries retain all periods and sum money in cents", () => {
  const shahar = Array.from({ length: 8 }, (_, index) =>
    payroll(`2024-${String(index + 1).padStart(2, "0")}-01`, `salary-${index}`, 100),
  );
  const summary = personalSalarySummary({
    shahar,
    kristin: [
      { id: "first", date: "2024-01-01", type: "cash", amount: 0.1 },
      { id: "second", date: "2024-01-02", type: "bit", amount: 0.2 },
    ],
  });
  assert.equal(summary.totals.shahar, 800);
  assert.equal(summary.ranges.shahar.from, "2024-01");
  assert.equal(summary.ranges.shahar.to, "2024-08");
  assert.equal(summary.months.length, 8);
  assert.equal(summary.totals.kristin, 0.3);
  assert.equal(summary.months[0].kristin, 0.3);
  assert.equal(summary.months.reduce((sum, month) => sum + month.shahar, 0), 800);
});

test("yearly timeline shows January through December and averages recorded months only", () => {
  const summary = personalSalarySummary({
    shahar: [
      payroll("2024-01-01", "january", 1000),
      payroll("2024-08-01", "august", 2000),
      payroll("2025-01-01", "other-year", 9000),
    ],
    kristin: [{ id: "cash", date: "2024-01-05", type: "cash", amount: 500 }],
  });
  const timeline = combinedSalaryTimeline(summary.months, "2024", "2026-11");
  assert.equal(timeline.length, 12);
  assert.equal(timeline[0].period, "2024-01");
  assert.equal(timeline[11].period, "2024-12");
  assert.equal(timeline[0].total, 1500);
  assert.equal(timeline[0].shahar, 1000);
  assert.equal(timeline[0].kristin, 500);
  assert.equal(timeline[7].total, 2000);
  assert.equal(timeline[7].shahar, 2000);
  assert.equal(timeline[7].kristin, 0);
  assert.equal(timeline[1].total, null);
  assert.equal(timeline[1].shahar, null);
  assert.equal(timeline[1].kristin, null);
  assert.equal(timeline[11].total, null);
  assert.ok(timeline.every((month) => month.annualAverage === 1750));
});

test("all years retain all months in order with a separate average for each year", () => {
  const timeline = combinedSalaryTimeline([
    { period: "2025-03", shahar: 1000, kristin: 2000 },
    { period: "2024-12", shahar: 0.1, kristin: 0.2 },
    { period: "2024-02", shahar: 0.2, kristin: 0.2 },
  ], "all", "2026-11");
  assert.equal(timeline.length, 24);
  assert.equal(timeline[0].period, "2024-01");
  assert.equal(timeline[11].period, "2024-12");
  assert.equal(timeline[12].period, "2025-01");
  assert.equal(timeline[23].period, "2025-12");
  assert.equal(timeline[11].total, 0.3);
  assert.ok(timeline.slice(0, 12).every((month) => month.annualAverage === 0.35));
  assert.ok(timeline.slice(12).every((month) => month.annualAverage === 3000));
});

test("an empty year has no fabricated income or average", () => {
  const timeline = combinedSalaryTimeline([], "2026", "2026-11");
  assert.equal(timeline.length, 12);
  assert.ok(timeline.every((month) => month.total === null && month.annualAverage === null));
  assert.equal(combinedSalaryTimeline([], "all", "2026-11").length, 0);
});

test("the average excludes current and future months but retains their income in the chart", () => {
  const timeline = combinedSalaryTimeline([
    { period: "2026-01", shahar: 1000, kristin: 500 },
    { period: "2026-10", shahar: 2000, kristin: 500 },
    { period: "2026-11", shahar: 100, kristin: 50 },
    { period: "2026-12", shahar: 9000, kristin: 1000 },
  ], "2026", "2026-11");
  assert.ok(timeline.every((month) => month.annualAverage === 2000));
  assert.equal(timeline[10].total, 150);
  assert.equal(timeline[10].shahar, 100);
  assert.equal(timeline[10].kristin, 50);
  assert.equal(timeline[11].total, 10000);
});

test("January has no completed months and December joins the average only next year", () => {
  const months = [
    { period: "2025-12", shahar: 1000, kristin: 1000 },
    { period: "2026-01", shahar: 500, kristin: 500 },
  ];
  const december = combinedSalaryTimeline(months, "2025", "2025-12");
  assert.equal(december[11].annualAverage, null);
  const previousYear = combinedSalaryTimeline(months, "2025", "2026-01");
  assert.ok(previousYear.every((month) => month.annualAverage === 2000));
  const january = combinedSalaryTimeline(months, "2026", "2026-01");
  assert.ok(january.every((month) => month.annualAverage === null));
  assert.equal(january[0].total, 1000);
});
