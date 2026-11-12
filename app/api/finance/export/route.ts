import admin from "../../../../lib/supabase/admin";
import { salaryIncomeDate } from "../../../../lib/income";
import {
  readBankTransactions,
  readFinanceRows,
} from "../../../../lib/finance-server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const [datasets, imports, transactions, salaries, overrides, income] =
      await Promise.all([
        admin
          .from("finance_datasets")
          .select("kind,payload")
          .order("imported_at", { ascending: false }),
        admin
          .from("bank_imports")
          .select("*")
          .order("imported_at", { ascending: false }),
        readBankTransactions(),
        readFinanceRows("shahar_salaries"),
        readFinanceRows("monthly_income_overrides", ["person", "month"]),
        readFinanceRows("transactions"),
      ]);
    if (datasets.error || imports.error) throw datasets.error ?? imports.error;
    return Response.json(
      {
        savings: datasets.data.find((row) => row.kind === "savings")?.payload,
        sourceMonths: datasets.data.find((row) => row.kind === "source_months")
          ?.payload,
        imports: imports.data,
        transactions,
        salaries: salaries.map((row) => ({
          ...row,
          salary_month: salaryIncomeDate(
            row.payment_date,
            Boolean(row.bank_transaction_id),
          ).slice(0, 7),
        })),
        overrides,
        income,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": 'attachment; filename="finance-data.json"',
        },
      },
    );
  } catch {
    return Response.json({ error: "ייצוא הנתונים נכשל" }, { status: 500 });
  }
}
