import admin from "./supabase/admin";

export async function readFinanceRows(table: string, orderFields = ["id"]) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    let query = admin.from(table).select("*");
    orderFields.forEach((field) => {
      query = query.order(field);
    });
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

export function readBankTransactions() {
  return readFinanceRows("bank_transactions", ["date", "source_order", "id"]);
}
