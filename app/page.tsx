import { FinanceDashboard } from "../components/FinanceDashboard";
import { Suspense } from "react";
import { loadFinanceOverview } from "../lib/finance-data";
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
        <div
          role="status"
          className="mx-auto mt-8 h-64 max-w-6xl animate-pulse rounded-2xl bg-slate-100"
        >
          <span className="sr-only">טוען סקירה…</span>
        </div>
      }
    >
      <OverviewContent />
    </Suspense>
  );
}
