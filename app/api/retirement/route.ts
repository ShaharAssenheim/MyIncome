import { loadRetirement } from "../../../lib/retirement-server";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!request.headers.get("x-user-id")) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await loadRetirement(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Retirement load failed", error);
    return Response.json({ error: "טעינת נתוני הפנסיה וקרן ההשתלמות נכשלה. נסו שוב." }, { status: 500 });
  }
}
