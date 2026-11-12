import { loadFinanceOverview } from "../../../lib/finance-data";

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
          "טעינת הנתונים נכשלה. יש לוודא שהורצה מיגרציית finance-migration.local.sql.",
      },
      { status: 500 },
    );
  }
}
