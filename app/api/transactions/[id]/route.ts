import { financeChanged } from "../../../../lib/finance-cache";
import { NextRequest } from "next/server";
import supabaseServer from "../../../../lib/supabase/admin";
import { z } from "zod";
import { findIncome } from "../../../../lib/income-server";

export const runtime = "nodejs";

// PUT /api/transactions/[id] - Update a transaction
const UpdateSchema = z.object({
  amount: z.number().finite().optional(),
  type: z.string().min(1).max(50).optional(),
  date: z.string().min(4).max(40).optional(),
  description: z.string().max(500).optional(),
  employer: z.string().max(200).nullable().optional(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (req.headers.get("x-site-admin") !== "true")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const json = await req.json();
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }
    const { amount, type, date, description, employer, payment_date } = parsed.data;
    const record = await findIncome(id);
    if (!record) return Response.json({ error: "Not found" }, { status: 404 });
    const update: Record<string, unknown> = {};
    if (amount !== undefined) update.amount = amount;
    if (type !== undefined) update.payment_method = type.toLowerCase();
    if (date !== undefined) update.income_date = date;
    if (payment_date !== undefined) update.payment_date = payment_date;
    if (description !== undefined) update.description = description;
    if (employer !== undefined) {
      update.employer = employer;
      if (record.is_salary && description === undefined) update.description = employer ? `משכורת · ${employer}` : "משכורת · המעסיק לא זוהה בדוח";
    }
    if (!Object.keys(update).length) return Response.json({ error: "No fields to update" }, { status: 400 });
    const { data, error } = await supabaseServer.from(record.table).update(update).eq("id", record.id).eq("is_deleted", false).select().single();
    if (error) throw error;
    financeChanged();
    return Response.json(data);
  } catch (e) {
    console.error("PUT /api/transactions/[id] error", e);
    return Response.json(
      { error: "Failed to update transaction" },
      { status: 500 },
    );
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (req.headers.get("x-site-admin") !== "true")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const record = await findIncome(id);
    if (!record) return Response.json({ error: "Not found" }, { status: 404 });
    const { error } = await supabaseServer.from(record.table).update({ is_deleted: true }).eq("id", record.id);
    if (error) throw error;
    financeChanged();
    return Response.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/transactions/[id] error", e);
    return Response.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
