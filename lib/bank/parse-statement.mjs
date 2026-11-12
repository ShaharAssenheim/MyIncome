// This adapter reads the monthly Bank Hapoalim transaction report layout.
// Coordinates identify columns; duplicate PDF text layers are removed first.
export async function parseStatement(bytes, pdfjs) {
  const document = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    useSystemFonts: true,
  }).promise;
  const transactions = [];
  const errors = [];
  const accounts = new Set();
  const monthPositions = new Map();
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const content = await (
        await document.getPage(pageNumber)
      ).getTextContent();
      const unique = new Map();
      for (const item of content.items) {
        if (!item.str?.trim()) continue;
        const x = Math.round(item.transform[4]);
        const y = Math.round(item.transform[5]);
        if (
          ![...unique.values()].some(
            (existing) =>
              existing.text === item.str &&
              Math.abs(existing.x - x) <= 1 &&
              Math.abs(existing.y - y) <= 1,
          )
        ) {
          unique.set(`${x}:${y}:${item.str}`, { text: item.str, x, y });
        }
      }
      const items = [...unique.values()];
      const header = items
        .filter((item) => item.y > 435)
        .map((item) => item.text)
        .join(" ");
      const account = header.match(/בחשבון\s+(\d+)/)?.[1];
      const reportDate = header.match(/ליום\s+(\d{2})\.(\d{2})\.(\d{2,4})/);
      if (!account || !reportDate) {
        errors.push(`Page ${pageNumber}: unsupported statement header`);
        continue;
      }
      accounts.add(account);
      const year =
        reportDate[3].length === 2
          ? 2000 + Number(reportDate[3])
          : Number(reportDate[3]);
      const month = Number(reportDate[2]);
      const lines = new Map();
      for (const item of items.filter((item) => item.y > 45 && item.y < 425)) {
        if (!lines.has(item.y)) lines.set(item.y, []);
        lines.get(item.y).push(item);
      }
      let previous = null;
      for (const [y, line] of [...lines].sort((a, b) => b[0] - a[0])) {
        line.sort((a, b) => a.x - b.x);
        const balanceText = line
          .filter((item) => item.x >= 100 && item.x < 155)
          .map((item) => item.text)
          .join(" ");
        const balance = balanceText.match(/-?[\d,]+\.\d{2}-?/);
        if (!balance) {
          if (previous)
            previous.detail += " " + line.map((item) => item.text).join(" ");
          continue;
        }
        const middle = line
          .filter((item) => item.x >= 155 && item.x < 470)
          .map((item) => item.text)
          .join(" ");
        const operation = line
          .filter((item) => item.x >= 155 && item.x < 470)
          .map((item) => item.text)
          .join(" ");
        const forward = operation.match(/\b(\d{2})\s+(\d{3})\s+(\d{3,4})/);
        const reverse = operation.match(/\b(\d{3})\s+(\d{2})\s*$/);
        const amountMatch =
          middle.match(/([\d,]*\.\d{2})\s+(\d{4})/) ??
          middle.match(/(\d{4})\s+([\d,]*\.\d{2})/);
        if ((!forward && !reverse) || !amountMatch) {
          errors.push(
            `Page ${pageNumber}, row ${y}: unrecognized transaction columns`,
          );
          previous = null;
          continue;
        }
        const day = Number(forward ? forward[1] : reverse[2]);
        const code = Number(forward ? forward[2] : reverse[1]);
        const amount = Number(
          (amountMatch[1].includes(".")
            ? amountMatch[1]
            : amountMatch[2]
          ).replaceAll(",", ""),
        );
        const valueDate = amountMatch[1].includes(".")
          ? amountMatch[2]
          : amountMatch[1];
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        if (new Date(date + "T12:00:00Z").getUTCDate() !== day) {
          errors.push(`Page ${pageNumber}: invalid transaction date`);
          continue;
        }
        const reference =
          middle
            .replace(amountMatch[0], "")
            .match(/\b\d{4,}\b/g)
            ?.join(":") ?? "";
        const period = date.slice(0, 7);
        const position = (monthPositions.get(period) ?? 0) + 1;
        monthPositions.set(period, position);
        const row = {
          account,
          date,
          value_date: valueDate,
          operation_code: code,
          reference,
          amount: code <= 300 ? amount : -amount,
          balance:
            Number(balance[0].replaceAll(",", "").replace(/-$/, "")) *
            (balance[0].endsWith("-") ? -1 : 1),
          description: operation
            .replace(forward?.[0] ?? reverse?.[0] ?? "", "")
            .trim(),
          detail: "",
          is_salary: code === 159,
          page: pageNumber,
          position,
        };
        const prior = transactions.at(-1);
        if (
          prior?.date.slice(0, 7) === period &&
          Math.abs(prior.balance + row.amount - row.balance) > 0.011
        ) {
          errors.push(
            `Page ${pageNumber}, row ${y}: running balance does not reconcile`,
          );
        }
        transactions.push(row);
        previous = row;
      }
    }
    return {
      transactions,
      errors,
      accounts: [...accounts],
      pages: document.numPages,
    };
  } finally {
    await document.destroy();
  }
}
