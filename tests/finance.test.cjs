const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

const compiled = ts.transpileModule(
  readFileSync(resolve(__dirname, "../lib/finance.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;
const finance = {};
runInNewContext(compiled, { exports: finance });
const { familyPortfolio, bankSummaries, compareSavingsMonths } = finance;

function savings(cash = 23738.02) {
  return {
    cash,
    cashAsOf: "2026-10-22",
    portfolioAsOf: "2026-10-24",
    holdings: [
      { name: "הראל", value: 793014.7 },
      { name: "איילון", value: 207427.42 },
      { name: "מניות", value: 305.2 },
    ],
  };
}

test("the original cash snapshot is newer than the imported bank statements", () => {
  const source = savings();
  const result = familyPortfolio({
    savings: source,
    bankYears: [{ date: "2026-09-25", balance: 70459.02 }],
  });
  assert.equal(result.cash.value, 23738.02);
  assert.equal(result.cash.date, "2026-10-22");
  assert.equal(result.holdings.length, 4);
  assert.equal(result.holdings[3].name, "עו״ש");
  assert.equal(result.holdings[3].value, 23738.02);
  assert.equal(result.holdings.reduce((cents, item) => cents + Math.round(item.value * 100), 0), 102448534);
  assert.equal(source.holdings.length, 3);
});

test("a newly imported statement updates cash without adding the older snapshot twice", () => {
  const result = familyPortfolio({
    savings: savings(),
    bankYears: [
      { date: "2026-11-20", balance: 31000.25 },
      { date: "2025-12-31", balance: 99999 },
    ],
  });
  assert.equal(result.cash.value, 31000.25);
  assert.equal(result.cash.date, "2026-11-20");
  assert.equal(result.holdings.filter((item) => item.name === "עו״ש").length, 1);
  assert.equal(result.holdings[3].value, 31000.25);
});

test("cash is available from bank statements even without an investments dataset", () => {
  const result = familyPortfolio({ savings: null, bankYears: [{ date: "2026-11-20", balance: 50 }] });
  assert.equal(result.holdings.length, 1);
  assert.equal(result.holdings[0].value, 50);
  const empty = familyPortfolio({ savings: null, bankYears: [] });
  assert.equal(empty.cash, null);
  assert.equal(empty.holdings.length, 0);
});

test("zero balances and overdrafts are retained rather than replaced by older positive balances", () => {
  for (const balance of [0, -1200.25]) {
    const result = familyPortfolio({ savings: savings(), bankYears: [{ date: "2026-11-20", balance }] });
    assert.equal(result.cash.value, balance);
    assert.equal(result.holdings[3].value, balance);
  }
});

test("monthly cash snapshots preserve yearly closing balances without transaction rows", () => {
  const closings = [
    { month: "2026-11-01", date: "2026-11-23", balance: 37321.43 },
    { month: "2025-12-01", date: "2025-12-31", balance: 1000 },
    { month: "2026-10-01", date: "2026-10-30", balance: 29259.02 },
  ];
  const result = bankSummaries(closings);
  assert.equal(result.bankMonths.length, 3);
  assert.equal(result.bankYears.length, 2);
  assert.equal(result.bankYears[0].balance, 1000);
  assert.equal(result.bankYears[1].balance, 37321.43);
  assert.equal(result.bankYears[1].date, "2026-11-23");
  assert.equal(closings[0].month, "2026-11-01");
});

test("month comparisons use reported total wealth and preserve cents across years", () => {
  const months = [
    { period: "2026-02", total: 400.03, cash: 90, deposit: 310.04 },
    { period: "2025-12", total: 300.01, cash: 100, deposit: 200.02 },
  ];
  const result = compareSavingsMonths(months, "2025-12", "2026-02");
  assert.equal(result.difference, 100.02);
  assert.ok(Math.abs(result.percentage - 100.02 / 300.01 * 100) < 1e-10);
  assert.equal(months[0].period, "2026-02");
  assert.equal(months[1].total, 300.01);
});

test("month comparisons support losses, unchanged wealth and zero starting balances", () => {
  const months = [
    { period: "2026-01", total: 100 }, { period: "2026-02", total: 75.25 },
    { period: "2026-03", total: 0 }, { period: "2026-04", total: -50 },
  ];
  assert.equal(compareSavingsMonths(months, "2026-01", "2026-02").difference, -24.75);
  assert.equal(compareSavingsMonths(months, "2026-01", "2026-02").percentage, -24.75);
  assert.equal(compareSavingsMonths(months, "2026-02", "2026-02").difference, 0);
  assert.equal(compareSavingsMonths(months, "2026-03", "2026-04").difference, -50);
  assert.equal(compareSavingsMonths(months, "2026-03", "2026-04").percentage, null);
  assert.equal(compareSavingsMonths(months, "2026-04", "2026-04").percentage, null);
});

test("missing months, backwards ranges and nonfinite totals cannot produce comparisons", () => {
  const months = [{ period: "2026-01", total: 100 }, { period: "2026-02", total: NaN }];
  assert.equal(compareSavingsMonths([], "2026-01", "2026-02"), null);
  assert.equal(compareSavingsMonths(months, "2025-12", "2026-01"), null);
  assert.equal(compareSavingsMonths(months, "2026-02", "2026-01"), null);
  assert.equal(compareSavingsMonths(months, "2026-01", "2026-02"), null);
});
