import { loadFinanceOverview } from "../../../lib/finance-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const owner = request.headers.get("x-user-id");
  if (!owner) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await loadFinanceOverview(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Finance load failed", error);
    return Response.json(
      {
        error:
          "טעינת הנתונים נכשלה. נסו שוב; יש לוודא שהוגדר מסד הנתונים לפי db/schema.sql.",
      },
      { status: 500 },
    );
  }
}
