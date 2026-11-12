import { NextRequest } from "next/server";
import { z } from "zod";
import admin from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const parsed = z
    .object({
      year: z
        .union([z.literal("all"), z.string().regex(/^\d{4}$/)])
        .default("all"),
      page: z.coerce.number().int().min(0).max(100000).default(0),
      search: z.string().max(200).default(""),
    })
    .safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success)
    return Response.json({ error: "Invalid filters" }, { status: 400 });
  const { year, page, search } = parsed.data;
  let query = admin.from("bank_transactions").select("*", { count: "exact" });
  if (year !== "all")
    query = query
      .gte("date", `${year}-01-01`)
      .lt("date", `${Number(year) + 1}-01-01`);
  if (search) {
    const pattern = JSON.stringify(
      `%${search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`,
    );
    const filters = [`description.ilike.${pattern}`, `detail.ilike.${pattern}`];
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(search) &&
      !Number.isNaN(Date.parse(search)) &&
      new Date(search).toISOString().slice(0, 10) === search
    )
      filters.push(`date.eq.${search}`);
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(search)) {
      const [searchYear, searchMonth] = search.split("-").map(Number);
      const nextYear = searchMonth === 12 ? searchYear + 1 : searchYear;
      const nextMonth = searchMonth === 12 ? 1 : searchMonth + 1;
      filters.push(
        `and(date.gte.${search}-01,date.lt.${nextYear}-${String(nextMonth).padStart(2, "0")}-01)`,
      );
    }
    if (/^\d{4}$/.test(search) && Number(search) > 0 && Number(search) < 9999) {
      filters.push(
        `and(date.gte.${search}-01-01,date.lt.${Number(search) + 1}-01-01)`,
      );
    }
    if (/^-?\d+(\.\d{1,2})?$/.test(search))
      filters.push(`amount.eq.${Number(search)}`);
    query = query.or(filters.join(","));
  }
  const { data, count, error } = await query
    .order("date", { ascending: false })
    .order("source_order", { ascending: false })
    .order("id", { ascending: false })
    .range(page * 50, page * 50 + 49);
  if (error)
    return Response.json({ error: "טעינת התנועות נכשלה" }, { status: 500 });
  return Response.json(
    { rows: data, count },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
