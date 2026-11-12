import { Suspense } from "react";
import { IncomeDashboard } from "./IncomeDashboard";
import { readIncome } from "../lib/income-server";

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
        <div
          role="status"
          className="mx-auto mt-8 h-64 max-w-5xl animate-pulse rounded-2xl bg-slate-100"
        >
          <span className="sr-only">טוען הכנסות…</span>
        </div>
      }
    >
      <IncomeContent person={person} />
    </Suspense>
  );
}
