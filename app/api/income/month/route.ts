import { financeChanged } from "../../../../lib/finance-cache";
import { NextRequest } from "next/server";
import { z } from "zod";
import admin from "../../../../lib/supabase/admin";
import { readIncome } from "../../../../lib/income-server";

const period = z.object({
  person: z.enum(["shahar", "kristin"]),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-01$/),
});
const amount = z
  .number()
  .finite()
  .min(0)
  .max(1e12)
  .transform((value) => Math.round(value * 100) / 100);
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const parsed = period.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success)
    return Response.json({ error: "Invalid month" }, { status: 400 });
  try {
    const { rows, overrides } = await readIncome(parsed.data.person);
    const totals = { cash: 0, bit: 0, bank: 0 };
    rows
      .filter((row) => row.date.slice(0, 7) === parsed.data.month.slice(0, 7))
      .forEach((row) => {
        if (Object.prototype.hasOwnProperty.call(totals, row.type)) {
          const category = row.type as keyof typeof totals;
          totals[category] =
            Math.round((totals[category] + row.amount) * 100) / 100;
        }
      });
    return Response.json(
      {
        ...totals,
        version:
          overrides.find((row) => row.month === parsed.data.month)
            ?.updated_at ?? null,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "טעינת החודש נכשלה" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (request.headers.get("x-site-admin") !== "true")
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const parsed = period
    .extend({
      cash: amount,
      bit: amount,
      bank: amount,
      version: z.string().datetime({ offset: true }).nullable(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "יש להזין סכומים תקינים" }, { status: 400 });
  const { data, error } = await admin.rpc("save_income_month", {
    p_person: parsed.data.person,
    p_month: parsed.data.month,
    p_cash: parsed.data.cash,
    p_bit: parsed.data.bit,
    p_bank: parsed.data.bank,
    p_actor: request.headers.get("x-user-id"),
    p_expected: parsed.data.version,
  });
  if (error)
    return Response.json(
      {
        error: error.message.includes("MONTH_CONFLICT")
          ? "החודש עודכן במקביל. יש לסגור ולפתוח שוב את העריכה."
          : "שמירת החודש נכשלה",
      },
      { status: error.message.includes("MONTH_CONFLICT") ? 409 : 500 },
    );
  financeChanged();
  return Response.json(data);
}
