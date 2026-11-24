"use client";
import { AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import { Alert } from "@/components/ui/alert";

import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { invalidateData, seedData, useDataQuery } from "../lib/client-data";
import { FinanceData, money } from "../lib/finance";
import { useAuth } from "../lib/useAuth";
import { useSearchParams } from "next/navigation";
import { FinanceOverview } from "./FinanceOverview";
import { SavingsComparison } from "./SavingsComparison";
const SavingsChart = dynamic(
  () => import("./FinanceCharts.tsx").then((module) => module.SavingsChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72  bg-muted"></Skeleton>,
  },
);
type Section = "savings" | "sources";
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function FinanceDashboard({
  initialData,
}: {
  initialData?: FinanceData;
}) {
  const { fetchWithAuth } = useAuth();
  const query = useDataQuery<FinanceData>("/api/finance", initialData);
  const [year, setYear] = useState("all");
  const searchParams = useSearchParams();
  const [section, setSection] = useState<Section>("savings");
  const [monthPage, setMonthPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    const view = searchParams.get("view");
    setSection(view && ["savings", "sources"].includes(view) ? view as Section : "savings");
  }, [searchParams]);
  useEffect(() => {
    if (!query.data) return;
    seedData("/api/transactions?person=kristin", query.data.income.kristin);
    seedData("/api/transactions?person=shahar", query.data.income.shahar);
  }, [query.data]);
  const data = query.data;
  const statistics = useMemo(() => {
    if (!data) return null;
    const months = (data.savings?.monthly ?? []).filter(
      (row) => year === "all" || row.year === Number(year),
    );
    return { months, latest: months.at(-1) };
  }, [data, year]);
  const years = useMemo(
    () =>
      data
        ? [
            ...new Set([
              ...data.bankYears.map((row) => String(row.year)),
              ...(data.savings?.monthly ?? []).map((row) => String(row.year)),
              ...data.income.kristin.map((row) => row.date.slice(0, 4)),
              ...data.income.shahar.map((row) => row.date.slice(0, 4)),
            ]),
          ]
            .sort()
            .reverse()
        : [],
    [data],
  );
  const sourceDifferences = useMemo(() => {
    const closings = new Map(
      data?.bankMonths?.map((row) => [
        row.month.slice(0, 7),
        Number(row.balance),
      ]) ?? [],
    );
    return (data?.sourceMonths?.months ?? [])
      .filter(
        ([period, value]) =>
          closings.has(period) &&
          Math.abs(closings.get(period)! - value) > 0.01,
      )
      .map(([period, value]) => ({
        period,
        original: value,
        reported: closings.get(period)!,
      }));
  }, [data]);
  async function exportAll() {
    setExporting(true);
    setActionError("");
    try {
      const response = await fetchWithAuth("/api/finance/export");
      if (!response.ok) throw new Error("ייצוא הנתונים נכשל");
      download(
        "finance-data.json",
        JSON.stringify(await response.json(), null, 2),
        "application/json",
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "הייצוא נכשל");
    } finally {
      setExporting(false);
    }
  }
  return (
    <main id="main-content" className="min-h-screen pb-16 text-foreground">
      <div className="ui-page finance-page flex flex-col gap-5">
        <div className="dashboard-welcome">
          <div>
            <h1 className="ui-page-title">סקירה כללית</h1>
          </div>
          <div className="welcome-actions flex gap-3">
            <Select
              items={[
                { value: "all", label: "כל השנים" },
                ...years.map((value) => ({ value, label: value })),
              ]}
              value={year}
              onValueChange={(value) => {
                if (value !== null) {
                  setYear(String(value));
                  setMonthPage(0);
                }
              }}
            >
              <SelectTrigger aria-label="שנת הנתונים" className="min-w-32">
                <CalendarDays data-icon="inline-start" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  <SelectItem value="all">כל השנים</SelectItem>
                  {years.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        {(query.error || actionError) && (
          <Alert variant="destructive">
            <AlertDescription>
              {query.error || actionError}
              <Button
                onClick={() => {
                  invalidateData();
                  setActionError("");
                }}
                className="mr-3 underline"
                type="submit"
              >
                ניסיון נוסף
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {query.loading && !data && (
          <Skeleton role="status" className="h-48  rounded-2xl bg-muted">
            <span className="sr-only">טוען נתונים…</span>
          </Skeleton>
        )}
        {data && statistics && (
          <Tabs
            value={section}
            onValueChange={(value) => {
              setSection(value as Section);
            }}
            className="gap-6"
          >
            <FinanceOverview data={data} statistics={statistics} />
            <TabsList
              id="finance-details"
              aria-label="פירוט הנתונים הכלכליים"
              variant="line"
              className="finance-tabs h-auto w-full flex-wrap justify-start gap-x-4 gap-y-1 border-b"
            >
              {(
                [
                  ["savings", "חיסכון והשקעות"],
                  ["sources", "מקורות ואירועים"],
                ] as const
              ).map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {section === "savings" && (
              <TabsContent value="savings" className="flex flex-col gap-6">
                {
                  <>
                    <div className="savings-detail-grid">
                      <Card>
                        <CardHeader>
                          <CardTitle>התפתחות החיסכון</CardTitle>
                          <CardDescription>
                            הפרשי השווי כוללים שינויי השקעות ואומדנים היסטוריים.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {statistics.months.length ? (
                            <SavingsChart data={statistics.months} />
                          ) : (
                            <Empty>
                              <EmptyHeader>
                                <EmptyTitle>אין תמונות מצב בתקופה</EmptyTitle>
                                <EmptyDescription>
                                  בחרו שנה אחרת כדי לראות את החיסכון לאורך הזמן.
                                </EmptyDescription>
                              </EmptyHeader>
                            </Empty>
                          )}
                        </CardContent>
                      </Card>
                      {data.savings && (
                        <Card>
                          <CardHeader>
                            <CardTitle>
                              תיק השקעות · {data.savings.portfolioAsOf}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="portfolio-positions">
                              {data.savings.holdings.map((item) => (
                                <dl key={item.name}>
                                  <dt className="text-xs text-muted-foreground">{item.name}</dt>
                                  <dd className="ui-number text-2xl font-medium">{money(item.value)}</dd>
                                </dl>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      </div>
                    <Card>
                      <CardHeader>
                        <CardTitle>יתרות חודשיות</CardTitle>
                        <CardAction>
                          <Button
                            className="text-primary"
                            onClick={() =>
                              download(
                                "savings.csv",
                                [
                                  "period,cash,deposit,harel,ayalon,stocks,total,change,status",
                                  ...statistics.months.map((row) =>
                                    [
                                      row.period,
                                      row.cash,
                                      row.deposit,
                                      row.harel,
                                      row.ayalon,
                                      row.stocks,
                                      row.total,
                                      row.change,
                                      row.status,
                                    ].join(","),
                                  ),
                                ].join("\n"),
                                "text/csv;charset=utf-8",
                              )
                            }
                            type="submit"
                            variant="ghost"
                          >
                            ייצוא CSV
                          </Button>
                        </CardAction>
                      </CardHeader>
                      <CardContent>
                        <SavingsComparison snapshots={data.savings?.monthly ?? []} />
                        <div
                          className="rounded-xl border border-border"
                        >
                          <Table aria-label="יתרות חודשיות">
                            <TableHeader>
                              <TableRow>
                                {[
                                  "חודש",
                                  "עו״ש",
                                  "פיקדון",
                                  "הראל",
                                  "איילון",
                                  "מניות",
                                  "סה״כ",
                                  "מקור",
                                ].map((label) => (
                                  <TableHead
                                    key={label}
                                    className="p-3 font-medium text-muted-foreground"
                                  >
                                    {label}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {statistics.months
                                .slice()
                                .reverse()
                                .slice(monthPage * 12, monthPage * 12 + 12)
                                .map((row) => (
                                  <TableRow
                                    key={row.period}
                                    className="border-t border-border"
                                  >
                                    <TableCell className="p-3">
                                      {row.period}
                                    </TableCell>
                                    {[
                                      row.cash,
                                      row.deposit,
                                      row.harel,
                                      row.ayalon,
                                      row.stocks,
                                      row.total,
                                    ].map((value, index) => (
                                      <TableCell
                                        key={index}
                                        className="p-3 tabular-nums"
                                      >
                                        {money(value)}
                                      </TableCell>
                                    ))}
                                    <TableCell className="p-3 text-xs">
                                      <Badge
                                        variant={
                                          row.status === "verified_cash"
                                            ? "secondary"
                                            : "outline"
                                        }
                                      >
                                        {row.status === "verified_cash"
                                          ? "עו״ש מדווח"
                                          : "כולל אומדן"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="ui-pagination">
                          <Button
                            className=""
                            disabled={monthPage === 0}
                            onClick={() => setMonthPage((value) => value - 1)}
                            type="submit"
                            variant="outline"
                          >
                            הקודם
                          </Button>
                          <Button
                            className=""
                            disabled={
                              (monthPage + 1) * 12 >= statistics.months.length
                            }
                            onClick={() => setMonthPage((value) => value + 1)}
                            type="submit"
                            variant="outline"
                          >
                            הבא
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                }
              </TabsContent>
            )}
            {section === "sources" && (
              <TabsContent value="sources" className="flex flex-col gap-6">
                {
                  <>
                    {sourceDifferences.length > 0 && (
                      <Alert variant="warning">
                        <AlertTitle>
                          פערים בין מקור החיסכון לדוחות הבנק
                        </AlertTitle>
                        {sourceDifferences.map((row) => (
                          <p key={row.period} className="text-sm leading-7">
                            {row.period} · במקור {money(row.original)} · בדוח{" "}
                            {money(row.reported)}
                          </p>
                        ))}
                      </Alert>
                    )}
                    <Card>
                      <CardHeader>
                        <CardTitle>אירועים והעברות בחיסכון</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {data.savings?.events
                          .filter(
                            (event) =>
                              year === "all" || event.date.startsWith(year),
                          )
                          .slice()
                          .reverse()
                          .map((event, index) => (
                            <article
                              key={index}
                              className="border-b border-border py-4"
                            >
                              <p className="text-xs text-muted-foreground">
                                {event.date}
                              </p>
                              <h3 className="my-2 font-semibold">
                                {event.title} · {money(event.amount)}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {event.detail}
                              </p>
                            </article>
                          ))}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle>מקורות ורמת הדיוק</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-inside list-disc flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
                          {data.savings?.notes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                        <p className="mt-4 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                          {data.savings?.sources.join(" · ")}
                        </p>
                        <Button
                          disabled={exporting}
                          onClick={exportAll}
                          className="mt-5"
                          type="submit"
                          variant="outline"
                        >
                          {exporting ? "מייצא…" : "ייצוא כל הנתונים"}
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                }
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </main>
  );
}
