import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { readIncome } from "../lib/income-server";
import { IncomeDashboard } from "./IncomeDashboard";
async function IncomeContent({ person }: { person: "kristin" | "shahar" }) {
  let initialData;
  try {
    initialData = (await readIncome(person)).rows;
  } catch (error) {
    console.error("Initial income load failed", error);
  }
  return <IncomeDashboard person={person} initialData={initialData} />;
}
export function IncomePage({ person }: { person: "kristin" | "shahar" }) {
  return (
    <Suspense
      fallback={
        <Skeleton
          role="status"
          className="mx-auto mt-8 h-64 max-w-5xl  rounded-2xl bg-muted"
        >
          <span className="sr-only">טוען הכנסות…</span>
        </Skeleton>
      }
    >
      <IncomeContent person={person} />
    </Suspense>
  );
}
