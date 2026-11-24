import { exportFinance } from "../../../../lib/finance-server";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await exportFinance(), {
      headers: { "Cache-Control": "private, no-store", "Content-Disposition": 'attachment; filename="finance-data.json"' },
    });
  } catch {
    return Response.json({ error: "ייצוא הנתונים נכשל" }, { status: 500 });
  }
}
