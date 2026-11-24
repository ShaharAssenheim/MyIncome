import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { FinanceDashboard } from "../components/FinanceDashboard";
import { loadFinanceOverview } from "../lib/finance-server";
export const dynamic = "force-dynamic";
async function OverviewContent() {
  let initialData;
  try {
    initialData = await loadFinanceOverview();
  } catch (error) {
    console.error("Initial overview load failed", error);
  }
  return <FinanceDashboard initialData={initialData} />;
}
export default function OverviewPage() {
  return (
    <Suspense
      fallback={
        <Skeleton
          role="status"
          className="mx-auto mt-8 h-64 max-w-6xl  rounded-2xl bg-muted"
        >
          <span className="sr-only">טוען סקירה…</span>
        </Skeleton>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
