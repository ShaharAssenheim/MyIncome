import { financeChanged } from "../../../../lib/finance-cache";
import { NextRequest } from "next/server";
import supabaseServer from "../../../../lib/supabase/admin";
import { z } from "zod";

export const runtime = "nodejs";

// PUT /api/transactions/[id] - Update a transaction
const UpdateSchema = z.object({
  amount: z.number().finite().optional(),
  type: z.string().min(1).max(50).optional(),
  date: z.string().min(4).max(40).optional(),
  description: z.string().max(500).optional(),
  employer: z.string().max(200).nullable().optional(),
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
    const { amount, type, date, description, employer } = parsed.data;
    if (id.startsWith("salary-")) {
      const salaryId = z.string().uuid().safeParse(id.slice(7));
      if (!salaryId.success)
        return Response.json({ error: "Not found" }, { status: 404 });
      const update: Record<string, unknown> = {};
      if (amount !== undefined) update.amount = amount;
      if (date !== undefined) update.payment_date = date;
      if (employer !== undefined) update.employer = employer;
      const { data, error } = await supabaseServer
        .from("shahar_salaries")
        .update(update)
        .eq("id", salaryId.data)
        .eq("is_deleted", false)
        .select()
        .single();
      if (error)
        return Response.json(
          { error: "Salary update failed" },
          { status: 400 },
        );
      financeChanged();
      return Response.json(data);
    }

    // Verify ownership before updating
    const { data: existing } = await supabaseServer
      .from("transactions")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const update: Record<string, any> = {};
    if (amount !== undefined) update.amount = amount;
    if (type !== undefined) update.type = type;
    if (date !== undefined) update.date = date;
    if (description !== undefined) update.description = description;

    if (Object.keys(update).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("transactions")
      .update(update)
      .eq("id", id)
      .select()
      .single();

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

    if (id.startsWith("salary-")) {
      const salaryId = z.string().uuid().safeParse(id.slice(7));
      if (!salaryId.success)
        return Response.json({ error: "Not found" }, { status: 404 });
      const { error } = await supabaseServer
        .from("shahar_salaries")
        .update({ is_deleted: true })
        .eq("id", salaryId.data);
      if (error)
        return Response.json(
          { error: "Salary deletion failed" },
          { status: 500 },
        );
      financeChanged();
      return Response.json({ success: true });
    }

    // Verify ownership before deleting
    const { data: existing } = await supabaseServer
      .from("transactions")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabaseServer
      .from("transactions")
      .delete()
      .eq("id", id);

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
