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
const {
  salaryIncomeDate,
  salaryToIncome,
  applyMonthlyOverrides,
  personalSalaryRows,
  personalSalarySummary,
} = income;

function salary(payment_date, id = "salary-source", amount = 1200) {
  return {
    id,
    bank_transaction_id: `bank-${id}`,
    payment_date,
    amount,
    employer: "Example employer",
    created_at: "2026-11-01T12:00:00Z",
  };
}

test("imported salary belongs to the previous month, including year and leap boundaries", () => {
  for (const [receipt, workMonth] of [
    ["2019-11-01", "2019-10-01"],
    ["2020-01-01", "2019-12-01"],
    ["2024-03-31", "2024-02-01"],
    ["2025-03-31", "2025-02-01"],
    ["2026-09-03", "2026-08-01"],
  ])
    assert.equal(salaryIncomeDate(receipt, true), workMonth);
});

test("receipt, source identity and amount survive repeated reads without another shift", () => {
  const source = salary("2020-01-31");
  const snapshot = JSON.stringify(source);
  const first = salaryToIncome(source);
  const next = salaryToIncome(source);
  assert.equal(first.date, "2019-12-01");
  assert.equal(first.payment_date, "2020-01-31");
  assert.equal(next.date, first.date);
  assert.equal(next.id, first.id);
  assert.equal(first.amount, source.amount);
  assert.equal(first.employer, source.employer);
  assert.equal(JSON.stringify(source), snapshot);
});

test("October 2019 manual total remains exact after the November receipt moves into October", () => {
  const rows = [
    salaryToIncome(salary("2019-11-01")),
    salaryToIncome(salary("2019-12-01", "next-salary", 1500)),
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
  const manualSalary = salaryToIncome({
    ...salary("2019-10-15"),
    bank_transaction_id: null,
  });
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
      salaryToIncome(salary("2024-03-01", "first", 200)),
      salaryToIncome(salary("2024-03-24", "second", 300)),
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
  const payroll = salaryToIncome(salary("2024-03-01", "payroll", 1200));
  const rows = applyMonthlyOverrides([
    payroll,
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
    salaryToIncome(salary("2019-07-01", "june", 1200)),
    salaryToIncome(salary("2019-08-01", "july", 1600)),
    salaryToIncome(salary("2019-10-01", "september", 1400)),
    salaryToIncome(salary("2019-11-01", "october", 1800)),
    salaryToIncome(salary("2019-12-01", "november", 1900)),
    salaryToIncome(salary("2020-01-01", "december", 2000)),
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
    salaryToIncome(salary("2019-11-01", "first", 700)),
    salaryToIncome(salary("2019-11-15", "second", 500)),
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
    salaryToIncome(salary("2024-03-01", "first", 1000)),
    salaryToIncome(salary("2024-04-01", "zero", 0)),
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
      salaryToIncome(salary("2025-01-01", "december", 1500)),
      salaryToIncome(salary("2025-02-01", "january", 2000)),
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
    salaryToIncome(salary(`2024-${String(index + 2).padStart(2, "0")}-01`, `salary-${index}`, 100)),
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
