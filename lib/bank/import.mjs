import { createHash } from "node:crypto";
import { parseStatement } from "./parse-statement.mjs";

export async function prepareStatement(bytes) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const result = await parseStatement(bytes, pdfjs);
  if (result.errors.length)
    throw new Error(
      "Statement could not be fully parsed: " + result.errors.join("; "),
    );
  if (result.accounts.length !== 1 || !result.transactions.length)
    throw new Error(
      "Expected a statement for one account containing transactions.",
    );
  const transactions = result.transactions.map((row) => ({
    ...row,
    fingerprint: createHash("sha256")
      .update(
        JSON.stringify([
          row.account,
          row.date,
          row.value_date,
          row.operation_code,
          row.reference,
          Math.round(row.amount * 100),
          Math.round(row.balance * 100),
        ]),
      )
      .digest("hex"),
  }));
  return {
    ...result,
    transactions,
    hash: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function commitStatement(client, owner, filename, prepared) {
  const { data, error } = await client.rpc("import_bank_statement", {
    p_owner: owner,
    p_hash: prepared.hash,
    p_filename: filename,
    p_account: prepared.accounts[0],
    p_rows: prepared.transactions,
  });
  if (error) throw new Error(error.message);
  return data;
}
