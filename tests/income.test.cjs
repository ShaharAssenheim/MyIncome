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
const { salaryIncomeDate, salaryToIncome, applyMonthlyOverrides } = income;

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
