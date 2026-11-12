import admin from "../../../lib/supabase/admin";
import { SITE_ADMIN_EMAIL } from "../../../lib/site-access";
import { z } from "zod";

export const dynamic = "force-dynamic";
function administrator(request: Request) {
  const id = request.headers.get("x-user-id");
  return id && request.headers.get("x-site-admin") === "true" ? { id } : null;
}

export async function GET(request: Request) {
  if (!administrator(request))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const { data, error } = await admin
    .from("site_allowed_emails")
    .select("email,created_at")
    .order("created_at");
  if (error)
    return Response.json(
      { error: "טעינת רשימת המורשים נכשלה" },
      { status: 500 },
    );
  return Response.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

async function changeAccess(request: Request, remove: boolean) {
  const user = administrator(request);
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email() })
    .safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "כתובת המייל אינה תקינה" }, { status: 400 });
  const email = parsed.data.email;
  if (email === SITE_ADMIN_EMAIL)
    return Response.json({ error: "הרשאת המנהל קבועה" }, { status: 400 });
  const result = remove
    ? await admin.from("site_allowed_emails").delete().eq("email", email)
    : await admin
        .from("site_allowed_emails")
        .upsert(
          { email, approved_by: user.id },
          { onConflict: "email", ignoreDuplicates: true },
        );
  if (result.error)
    return Response.json({ error: "עדכון ההרשאה נכשל" }, { status: 500 });
  return Response.json({ success: true });
}
export async function POST(request: Request) {
  return changeAccess(request, false);
}
export async function DELETE(request: Request) {
  return changeAccess(request, true);
}
