import { financeChanged } from "../../../lib/finance-cache";
import { NextRequest } from "next/server";
import supabaseServer from "../../../lib/supabase/admin";
import { z } from "zod";
import { readIncome } from "../../../lib/income-server";
import { incomeTable } from "../../../lib/income";

export const runtime = "nodejs";

// GET /api/transactions - List income for the selected person in the family workspace.
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const person = req.nextUrl.searchParams.get("person") ?? "kristin";
    if (person !== "kristin" && person !== "shahar") {
      return Response.json({ error: "Invalid person" }, { status: 400 });
    }
    const { rows } = await readIncome(person);
    return Response.json(rows, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    console.error("GET /api/transactions error", e);
    return Response.json(
      { error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}

// POST /api/transactions - Create a new transaction
const TransactionSchema = z.object({
  person: z.enum(["kristin", "shahar"]).default("kristin"),
  amount: z.number().finite(),
  type: z.string().min(1).max(50),
  date: z.string().min(4).max(40),
  description: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  if (req.headers.get("x-site-admin") !== "true")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = TransactionSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid transaction data" },
        { status: 400 },
      );
    }
    const { amount, type, date, description, person } = parsed.data;
    const { data, error } = await supabaseServer.from(incomeTable(person)).insert({
      owner_id: userId, amount, payment_method: type.toLowerCase(), income_date: date, description,
    }).select().single();

    if (error) throw error;
    financeChanged();
    return Response.json(data, { status: 201 });
  } catch (e) {
    console.error("POST /api/transactions error", e);
    return Response.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
