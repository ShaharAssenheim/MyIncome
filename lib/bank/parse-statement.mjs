const cents = (value) => Math.round(value * 100);
const number = (text) => {
  const cleaned = text.replace(/[₪,\s\u200e\u200f]/g, "");
  if (!/^-?\d+\.\d{2}-?$/.test(cleaned)) return null;
  return Number(cleaned.replace(/-$/, "")) * (cleaned.endsWith("-") ? -1 : 1);
};
const isoDate = (text) => {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  return new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date ? date : null;
};

export function parseCurrentAccountPages(pages) {
  const transactions = [];
  const errors = [];
  const accounts = new Set();
  let reportDate = null;
  for (const [index, items] of pages.entries()) {
    const page = index + 1;
    const accountLabel = items.find((item) => item.text === "חשבון" && item.y > 700);
    const account = accountLabel && items.find((item) => /^\d+$/.test(item.text)
      && Math.abs(item.x - accountLabel.x) < 40 && item.y < accountLabel.y && item.y > accountLabel.y - 30)?.text;
    const pageDate = items.find((item) => item.y > 760 && isoDate(item.text));
    if (!account || !pageDate) {
      errors.push(`Page ${page}: unsupported current-account header`);
      continue;
    }
    accounts.add(account);
    const date = isoDate(pageDate.text);
    if (reportDate && date !== reportDate) errors.push(`Page ${page}: inconsistent report date`);
    reportDate = date;
    const headerY = items.find((item) => item.text === "תאריך" && item.x > 500)?.y;
    if (!headerY) {
      errors.push(`Page ${page}: missing transaction column headings`);
      continue;
    }
    const dates = items.filter((item) => item.x > 500 && item.y > 50 && item.y < headerY - 5 && isoDate(item.text));
    for (const item of dates) {
      const line = items.filter((candidate) => Math.abs(candidate.y - item.y) <= 2);
      const balance = line.find((candidate) => candidate.x >= 70 && candidate.x < 155 && candidate.text.includes("₪"));
      const credit = line.find((candidate) => candidate.x >= 155 && candidate.x < 220 && number(candidate.text) !== null);
      const debit = line.find((candidate) => candidate.x >= 220 && candidate.x < 300 && number(candidate.text) !== null);
      const description = line.filter((candidate) => candidate.x >= 300 && candidate.x < 500)
        .sort((a, b) => b.x - a.x).map((candidate) => candidate.text).join(" ");
      if (!balance || number(balance.text) === null || Boolean(credit) === Boolean(debit) || !description) {
        errors.push(`Page ${page}, row ${item.y}: incomplete current-account transaction`);
        continue;
      }
      transactions.push({
        account, date: isoDate(item.text), value_date: "", operation_code: 0, reference: "",
        amount: credit ? number(credit.text) : -number(debit.text), balance: number(balance.text),
        description, detail: "", is_salary: description.trim() === "משכורת", page,
      });
    }
    const balanceRows = items.filter((item) => item.x >= 70 && item.x < 155 && item.y > 50 && item.y < headerY - 5 && item.text.includes("₪"));
    if (balanceRows.length !== dates.length) errors.push(`Page ${page}: not every balance row has a valid transaction date`);
  }
  // The online report lists newest first, including within a single day.
  transactions.reverse();
  const positions = new Map();
  for (const [index, row] of transactions.entries()) {
    const prior = transactions[index - 1];
    if (prior && (row.date < prior.date || cents(prior.balance) + cents(row.amount) !== cents(row.balance))) {
      errors.push(`Page ${row.page}: transaction order or running balance does not reconcile`);
    }
    const period = row.date.slice(0, 7);
    row.position = (positions.get(period) ?? 0) + 1;
    positions.set(period, row.position);
  }
  return { transactions, errors, accounts: [...accounts], pages: pages.length, format: "current-account", reportDate };
}

export async function parseCurrentAccountDocument(document) {
  const pages = [];
  for (let page = 1; page <= document.numPages; page++) {
    const content = await (await document.getPage(page)).getTextContent();
    const items = [];
    for (const item of content.items) {
      if (!item.str?.trim()) continue;
      const entry = { text: item.str.trim(), x: Math.round(item.transform[4]), y: Math.round(item.transform[5]) };
      if (!items.some((existing) => existing.text === entry.text && Math.abs(existing.x - entry.x) <= 1 && Math.abs(existing.y - entry.y) <= 1)) items.push(entry);
    }
    pages.push(items);
  }
  return parseCurrentAccountPages(pages);
}



// Read both the monthly statement and the online current-account report.
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
    const firstPage = await (await document.getPage(1)).getTextContent();
    if (firstPage.items.some((item) => /יתרה בש["״]ח/.test(item.str))
      && firstPage.items.some((item) => item.transform[4] > 500 && /^\d{2}\/\d{2}\/\d{4}$/.test(item.str))) {
      return await parseCurrentAccountDocument(document);
    }
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
