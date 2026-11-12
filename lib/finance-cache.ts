import { revalidateTag } from "next/cache";
export function financeChanged() {
  revalidateTag("finance-data");
}
