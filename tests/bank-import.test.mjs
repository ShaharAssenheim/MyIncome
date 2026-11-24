import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCurrentAccountPages } from "../lib/bank/parse-statement.mjs";

const header = [
  { text: "חשבון", x: 120, y: 738 }, { text: "123456", x: 111, y: 724 },
  { text: "24/11/2026", x: 15, y: 788 }, { text: "תאריך", x: 553, y: 608 },
  // The report period is above the transaction headings and must not become a row.
  { text: "24/11/2026", x: 534, y: 631 },
];
function row(date, amount, balance, y, credit = true, description = "העברה") {
  return [{ text: date, x: 530, y }, { text: amount, x: credit ? 170 : 240, y },
    { text: `₪${balance}`, x: 99, y }, { text: description, x: 450, y }];
}

test("parse reverse-order online statements across pages and retain negative debit reversals", () => {
  const parsed = parseCurrentAccountPages([
    [...header, ...row("08/11/2026", "-2.00", "1,102.00", 580, false), ...row("06/11/2026", "100.00", "1,100.00", 550, true, "משכורת")],
    [...header, ...row("05/11/2026", "200.00", "1,000.00", 580, false)],
  ]);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.transactions.length, 3);
  assert.equal(parsed.transactions[0].amount, -200);
  assert.equal(parsed.transactions[1].is_salary, true);
  assert.equal(parsed.transactions[2].amount, 2);
  assert.equal(parsed.transactions[2].position, 3);
  assert.equal(parsed.transactions[2].balance, 1102);
});

test("reject missing transactions and running-balance discrepancies", () => {
  const mismatched = parseCurrentAccountPages([[...header,
    ...row("06/11/2026", "100.00", "999.00", 580), ...row("05/11/2026", "100.00", "800.00", 550)]]);
  assert.ok(mismatched.errors.some((error) => error.includes("does not reconcile")));
  const incomplete = parseCurrentAccountPages([[...header, ...row("06/11/2026", "100.00", "999.00", 580).filter((item) => item.x !== 530)]]);
  assert.ok(incomplete.errors.some((error) => error.includes("not every balance row")));
});

