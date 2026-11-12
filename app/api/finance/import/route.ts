import { financeChanged } from "../../../../lib/finance-cache";
import { findPreview, savePreview } from "../../../../lib/bank/preview-cache";
import admin from "../../../../lib/supabase/admin";
import {
  prepareStatement,
  commitStatement,
} from "../../../../lib/bank/import.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (request.headers.get("x-site-admin") !== "true")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const owner = request.headers.get("x-user-id");
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 4 * 1024 * 1024 ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return Response.json(
        { error: "יש לבחור דוח PDF עד 4MB." },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const prepared =
      findPreview(String(form.get("preview_token") ?? ""), owner, bytes) ??
      (await prepareStatement(bytes));
    if (form.get("preview") === "true") {
      return Response.json({
        token: savePreview(owner, prepared),
        account: prepared.accounts[0],
        rows: prepared.transactions.length,
        salaries: prepared.transactions.filter((row) => row.is_salary).length,
        from: prepared.transactions.map((row) => row.date).sort()[0],
        to: prepared.transactions
          .map((row) => row.date)
          .sort()
          .at(-1),
      });
    }
    const result = await commitStatement(admin, owner, file.name, prepared);
    financeChanged();
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "ייבוא הדוח נכשל" },
      { status: 400 },
    );
  }
}
