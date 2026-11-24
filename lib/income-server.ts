import admin, { readRows } from "./supabase/admin";
import { unstable_cache } from "next/cache";
import { applyMonthlyOverrides, incomeRecordToRow, incomeTable, type IncomePerson, type IncomeRecord, type MonthOverride } from "./income";

async function loadIncome(person: IncomePerson) {
  const [records, edits] = await Promise.all([
    readRows(incomeTable(person), ["income_date", "id"], "*", { is_deleted: false }),
    readRows("income_month_overrides", ["income_month"], "*", { person }),
  ]);
  const overrides: MonthOverride[] = edits.map((row) => ({
    person: row.person, month: row.income_month, cash: Number(row.cash_amount),
    bit: Number(row.bit_amount), bank: Number(row.bank_amount), updated_at: row.updated_at,
  }));
  return { rows: applyMonthlyOverrides(records.map((row: IncomeRecord) => incomeRecordToRow(row, person)), overrides), overrides };
}

export const readIncome = unstable_cache(loadIncome, ["income-v7"], {
  revalidate: 30, tags: ["finance-data"],
});

// Prefixes identify the person's table; ambiguous bare UUIDs never select one arbitrarily.
export async function findIncome(identifier: string) {
  const match = /^(salary|shahar|kristin)-(.+)$/.exec(identifier);
  const id = match?.[2] ?? identifier;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
  const tables = match ? [match[1] === "kristin" ? "kristin_income" : "shahar_income"] : ["shahar_income", "kristin_income"];
  const matches = await Promise.all(tables.map(async (table) => {
    const { data, error } = await admin.from(table).select("id,is_salary").eq("id", id).eq("is_deleted", false).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { table, ...data } : null;
  }));
  const records = matches.filter(Boolean);
  if (records.length !== 1 || (match?.[1] === "salary" && !records[0]!.is_salary)) return null;
  return records[0]!;
}
