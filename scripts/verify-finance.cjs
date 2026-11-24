// Read-only smoke check using the same data-access modules as the application.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");
require("@next/env").loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const modules = new Map();
function load(file) {
  file = path.resolve(__dirname, "..", file);
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, { exports, process, console, Response, require(name) {
    // CLI verification has no Next.js request/cache context.
    if (name === "next/cache") return { unstable_cache: (fn) => fn };
    return name.startsWith(".") ? load(path.resolve(path.dirname(file), name + ".ts")) : require(name);
  } }, { filename: file });
  return exports;
}

async function verify() {
  const finance = load("lib/finance-server.ts");
  const [overview, exported] = await Promise.all([finance.loadFinanceOverview(), finance.exportFinance()]);
  assert.equal(exported.schemaVersion, 2);
  for (const person of ["shahar", "kristin"]) {
    for (const row of exported[person + "Income"]) {
      assert.ok(Number.isFinite(Number(row.amount)), `${person}: nonfinite amount`);
      assert.match(row.income_date, /^\d{4}-\d{2}-\d{2}$/);
    }
  }
  assert.equal(overview.savings.monthly.length, exported.savingsMonthlySnapshots.length);
  const latest = exported.cashMonthlyBalances.filter((row) => row.balance_date)
    .sort((a, b) => b.balance_date.localeCompare(a.balance_date))[0];
  assert.equal(overview.savings.cash, Number(latest.balance));
  assert.equal(overview.savings.cashAsOf, latest.balance_date);
  const baseline = process.argv.indexOf("--baseline");
  if (baseline !== -1) {
    assert.ok(process.argv[baseline + 1], "--baseline requires a schema-version-2 export path");
    assert.deepEqual(JSON.parse(JSON.stringify(exported)), JSON.parse(fs.readFileSync(path.resolve(process.argv[baseline + 1]), "utf8")), "Finance records differ from the saved export");
  }
  let backupPath;
  if (process.argv.includes("--backup")) {
    backupPath = path.resolve(__dirname, `../db/finance-export-${new Date().toISOString().replaceAll(":", "-")}.local.json`);
    fs.writeFileSync(backupPath, JSON.stringify(exported, null, 2), { flag: "wx" });
  }
  console.log(JSON.stringify({ verified: true, liveDatabaseModified: false,
    income: { shahar: exported.shaharIncome.length, kristin: exported.kristinIncome.length },
    cashMonths: exported.cashMonthlyBalances.length, savingsMonths: exported.savingsMonthlySnapshots.length,
    currentCash: overview.savings.cash, currentInvestments: overview.savings.portfolio,
    ...(backupPath ? { backupPath } : {}),
  }, null, 2));
}
verify().catch((error) => { console.error(error.message); process.exitCode = 1; });
