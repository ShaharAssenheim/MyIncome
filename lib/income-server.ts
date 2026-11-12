import admin from "./supabase/admin";
import { unstable_cache } from "next/cache";
import { applyMonthlyOverrides, IncomeRow, MonthOverride } from "./income";

async function readManual(person: "kristin" | "shahar") {
  const manual: IncomeRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin
      .from("transactions")
      .select("id,amount,type,date,description,created_at")
      .eq("person", person)
      .order("date")
      .order("id")
      .range(offset, offset + 999);
    if (error) throw error;
    manual.push(...data);
    if (data.length < 1000) break;
  }
  return manual;
}

async function readSalaries(person: "kristin" | "shahar") {
  const salary: IncomeRow[] = [];
  if (person === "shahar") {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin
        .from("shahar_salaries")
        .select("id,payment_date,amount,employer,created_at")
        .eq("is_deleted", false)
        .order("payment_date")
        .order("id")
        .range(offset, offset + 999);
      if (error) throw error;
      salary.push(
        ...data.map((row) => ({
          id: `salary-${row.id}`,
          date: row.payment_date,
          amount: Number(row.amount),
          type: "bank",
          employer: row.employer,
          description: row.employer
            ? `משכורת · ${row.employer}`
            : "משכורת · המעסיק לא זוהה בדוח",
          created_at: row.created_at,
        })),
      );
      if (data.length < 1000) break;
    }
  }
  return salary;
}

async function readOverrides(person: "kristin" | "shahar") {
  const rows: MonthOverride[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin
      .from("monthly_income_overrides")
      .select("person,month,cash,bit,bank,updated_at")
      .eq("person", person)
      .order("month")
      .range(offset, offset + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

async function loadIncome(person: "kristin" | "shahar") {
  const [manual, salary, overrides] = await Promise.all([
    readManual(person),
    readSalaries(person),
    readOverrides(person),
  ]);
  return {
    rows: applyMonthlyOverrides([...manual, ...salary], overrides),
    overrides,
  };
}

export const readIncome = unstable_cache(loadIncome, ["income-v2"], {
  revalidate: 30,
  tags: ["finance-data"],
});
