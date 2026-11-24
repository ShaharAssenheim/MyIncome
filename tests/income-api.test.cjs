const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");
const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";

function load(file, modules) {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(resolve(__dirname, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Response, console, process: { env: {} }, require(name) {
    if (modules[name]) return modules[name];
    if (name === "zod") return require("zod");
    throw new Error(`Unexpected module ${name}`);
  } });
  return exports;
}

function context() {
  const rows = { shahar_income: [{ id, is_salary: true, is_deleted: false, payment_date: "2026-10-05", income_date: "2026-09-01", amount: 100 }],
    kristin_income: [], income_month_overrides: [] };
  const calls = [];
  const client = { from(table) {
    calls.push(table);
    const filters = [];
    let mutation;
    let range;
    const chain = {
      select() { return chain; }, eq(key, value) { filters.push([key, value]); return chain; },
      update(values) { mutation = { kind: "update", values }; return chain; },
      insert(values) { mutation = { kind: "insert", values }; return chain; },
      order() { return chain; }, range(from, to) { range = [from, to]; return chain; },
      async single() { return execute(); }, async maybeSingle() { return execute(); },
      then(done, failed) { return execute().then(done, failed); },
    };
    async function execute() {
      if (mutation?.kind === "insert") {
        const record = { id: "33333333-3333-4333-8333-333333333333", ...mutation.values };
        rows[table].push(record); return { data: record, error: null };
      }
      const selected = rows[table].filter((row) => filters.every(([key, value]) => row[key] === value));
      if (range) return { data: selected.slice(range[0], range[1] + 1), error: null };
      const record = selected[0];
      if (record && mutation?.kind === "update") Object.assign(record, mutation.values);
      return { data: record ?? null, error: null };
    }
    return chain;
  } };
  const income = load("../lib/income.ts", {});
  const database = load("../lib/supabase/admin.ts", { "@supabase/supabase-js": { createClient: () => client } });
  const server = load("../lib/income-server.ts", { "./supabase/admin": database, "./income": income, "next/cache": { unstable_cache: (fn) => fn } });
  const common = { "../../../lib/finance-cache": { financeChanged() {} }, "../../../lib/supabase/admin": { default: client },
    "../../../lib/income-server": server,
    "../../../lib/income": income };
  const create = load("../app/api/transactions/route.ts", common);
  const edit = load("../app/api/transactions/[id]/route.ts", {
    "../../../../lib/finance-cache": common["../../../lib/finance-cache"],
    "../../../../lib/supabase/admin": { default: client },
    "../../../../lib/income-server": server,
  });
  return { rows, calls, create, edit };
}
const request = (method, body, admin = true) => new Request("https://example.test/api/transactions", {
  method, headers: { "Content-Type": "application/json", "x-site-admin": String(admin), "x-user-id": owner },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test("new income goes only to the selected person's table", async () => {
  const current = context();
  const response = await current.create.POST(request("POST", { person: "kristin", amount: 55, type: "cash", date: "2026-09-01", description: "manual" }));
  assert.equal(response.status, 201);
  assert.equal(current.rows.kristin_income[0].owner_id, owner);
  assert.equal(current.rows.kristin_income[0].income_date, "2026-09-01");
  assert.equal(current.rows.shahar_income.length, 1);
});

test("editing a work date leaves the original payment date intact", async () => {
  const current = context();
  const result = await current.edit.PUT(request("PUT", { amount: 150, date: "2026-08-01" }), { params: Promise.resolve({ id: `salary-${id}` }) });
  assert.equal(result.status, 200);
  assert.equal(current.rows.shahar_income[0].income_date, "2026-08-01");
  assert.equal(current.rows.shahar_income[0].payment_date, "2026-10-05");
  assert.equal(current.rows.shahar_income[0].amount, 150);
});

test("delete is scoped to the correct person and ambiguous old identifiers cannot delete either row", async () => {
  const current = context();
  current.rows.kristin_income.push({ id, is_salary: false, is_deleted: false, amount: 5 });
  assert.equal((await current.edit.DELETE(request("DELETE"), { params: Promise.resolve({ id }) })).status, 404);
  assert.equal(current.rows.shahar_income[0].is_deleted, false);
  assert.equal(current.rows.kristin_income[0].is_deleted, false);
  assert.equal((await current.edit.DELETE(request("DELETE"), { params: Promise.resolve({ id: `kristin-${id}` }) })).status, 200);
  assert.equal(current.rows.kristin_income[0].is_deleted, true);
  assert.equal(current.rows.shahar_income[0].is_deleted, false);
});

test("non-administrators and invalid people cannot mutate any income table", async () => {
  const current = context();
  assert.equal((await current.create.POST(request("POST", { amount: 1, type: "cash", date: "2026-09-01" }, false))).status, 403);
  assert.equal((await current.create.POST(request("POST", { person: "unknown", amount: 1, type: "cash", date: "2026-09-01" }))).status, 400);
  assert.equal((await current.edit.DELETE(request("DELETE", undefined, false), { params: Promise.resolve({ id: `salary-${id}` }) })).status, 403);
  assert.equal(current.calls.length, 0);
});

test("income reads retain more than one page, exclude deleted rows and apply monthly edits once", async () => {
  const current = context();
  current.rows.shahar_income = Array.from({ length: 1001 }, (_, index) => ({
    id: String(index), is_salary: true, is_deleted: false, income_date: "2026-09-01",
    payment_date: "2026-10-05", amount: 1, payment_method: "bank", created_at: "2026-09-01Z",
  }));
  current.rows.shahar_income.push({ ...current.rows.shahar_income[0], id: "deleted", is_deleted: true, amount: 5000 });
  current.rows.income_month_overrides.push({ person: "shahar", income_month: "2026-09-01",
    cash_amount: 0, bit_amount: 0, bank_amount: 1000.5, updated_at: "2026-10-01T00:00:00Z" });
  const response = await current.create.GET({ headers: new Headers({ "x-user-id": owner }),
    nextUrl: new URL("https://example.test/api/transactions?person=shahar") });
  assert.equal(response.status, 200);
  const rows = await response.json();
  assert.equal(rows.length, 1002);
  assert.equal(rows.reduce((sum, row) => sum + row.amount, 0), 1000.5);
  assert.equal(rows.filter((row) => row.month_override).length, 1);
  assert.ok(rows.filter((row) => !row.month_override).every((row) => row.payment_date === "2026-10-05"));
  assert.ok(current.calls.every((table) => ["shahar_income", "income_month_overrides"].includes(table)));
});
