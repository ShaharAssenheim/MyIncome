import { readFileSync } from "node:fs";
import { parseStatement } from "../lib/bank/parse-statement.mjs";

if (process.argv.includes("--apply")) throw new Error("This tool only extracts information for review; it cannot update the database.");
const path = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (!path) throw new Error("Usage: node scripts/extract-current-account.mjs <report.pdf>");
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const prepared = await parseStatement(readFileSync(path), pdfjs);
if (prepared.errors.length) throw new Error("Statement could not be fully parsed: " + prepared.errors.join("; "));
if (prepared.accounts.length !== 1 || !prepared.transactions.length) throw new Error("Expected transactions from exactly one account.");
const closings = new Map();
for (const row of prepared.transactions) closings.set(row.date.slice(0, 7), { month: `${row.date.slice(0, 7)}-01`, balance: row.balance, date: row.date });
console.log(JSON.stringify({ reportDate: prepared.reportDate, salaries: prepared.transactions.filter((row) => row.is_salary)
  .map((row) => ({ payment_date: row.date, amount: row.amount })), bankClosings: [...closings.values()] }, null, 2));
