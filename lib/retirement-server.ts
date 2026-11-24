import { unstable_cache } from "next/cache";
import { readRows } from "./supabase/admin";
import { retirementRecords } from "./retirement";

export const loadRetirement = unstable_cache(async () => {
  const [accounts, reports] = await Promise.all([
    readRows("retirement_accounts", ["person", "product", "id"]),
    readRows("retirement_reports", ["period_end", "account_id"]),
  ]);
  return retirementRecords(accounts, reports);
}, ["retirement-v1"], { revalidate: 30, tags: ["finance-data"] });
