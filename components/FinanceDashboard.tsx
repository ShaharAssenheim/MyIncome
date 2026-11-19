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
import { Input } from "@/components/ui/input";
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
import {
  CalendarDays,
  Upload,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { invalidateData, seedData, useDataQuery } from "../lib/client-data";
import { BankTransaction, FinanceData, money } from "../lib/finance";
import { incomeDateParts } from "../lib/income-date";
import { personalSalaryRows } from "../lib/income";
import { useAuth } from "../lib/useAuth";
import { useSearchParams } from "next/navigation";
import { FinanceOverview } from "./FinanceOverview";
const SavingsChart = dynamic(
  () => import("./FinanceCharts.tsx").then((module) => module.SavingsChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72  bg-muted"></Skeleton>,
  },
);
const SalaryChart = dynamic(
  () => import("./FinanceCharts.tsx").then((module) => module.SalaryChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-72  bg-muted"></Skeleton>,
  },
);
const BankImport = dynamic(() =>
  import("./BankImport.tsx").then((module) => module.BankImport),
);
const inputStyle = "w-full sm:w-60";
type Section = "savings" | "salary" | "transactions" | "sources";
function Stat({
  title,
  value,
  detail,
  plain = false,
  icon: Icon = WalletCards,
}: {
  title: string;
  value: string;
  detail?: string;
  plain?: boolean;
  icon?: LucideIcon;
}) {
  if (plain)
    return (
      <dl>
        <dt className="text-xs text-muted-foreground">{title}</dt>
        <dd className="ui-number mt-3 text-2xl font-medium">{value}</dd>
        {detail && (
          <dd className="mt-2 text-[11px] leading-5 text-muted-foreground">
            {detail}
          </dd>
        )}
      </dl>
    );
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <span className="metric-card-icon">
            <Icon size={16} aria-hidden="true" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="metric-value">{value}</p>
        {detail && (
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
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
  const { user, fetchWithAuth } = useAuth();
  const query = useDataQuery<FinanceData>("/api/finance", initialData);
  const [year, setYear] = useState("all");
  const searchParams = useSearchParams();
  const [section, setSection] = useState<Section>("savings");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [monthPage, setMonthPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState("");
  useEffect(() => {
    const view = searchParams.get("view");
    setSection(view && ["savings", "salary", "transactions", "sources"].includes(view) ? view as Section : "savings");
    setPage(0);
  }, [searchParams]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!query.data) return;
    seedData("/api/transactions?person=kristin", query.data.income.kristin);
    seedData("/api/transactions?person=shahar", query.data.income.shahar);
  }, [query.data]);
  const bank = useDataQuery<{
    rows: BankTransaction[];
    count: number;
  }>(
    section === "transactions"
      ? `/api/finance/transactions?year=${year}&page=${page}&search=${encodeURIComponent(debouncedSearch)}`
      : null,
  );
  const data = query.data;
  const statistics = useMemo(() => {
    if (!data) return null;
    const months = (data.savings?.monthly ?? []).filter(
      (row) => year === "all" || row.year === Number(year),
    );
    const salary = personalSalaryRows(data.income.shahar, "shahar", year);
    const monthly = new Map<string, number>();
    salary.forEach((row) =>
      monthly.set(
        row.date.slice(0, 7),
        Math.round(
          ((monthly.get(row.date.slice(0, 7)) ?? 0) + Number(row.amount)) * 100,
        ) / 100,
      ),
    );
    const now = incomeDateParts();
    const currentPeriod = `${now.year}-${String(now.month).padStart(2, "0")}`;
    const completed = [...monthly].filter(
      ([month, amount]) => month < currentPeriod && amount !== 0,
    );
    const chart = new Map<string, number>();
    if (year === "all")
      monthly.forEach((amount, month) =>
        chart.set(
          month.slice(0, 4),
          (chart.get(month.slice(0, 4)) ?? 0) + amount,
        ),
      );
    else
      for (let index = 1; index <= 12; index++)
        chart.set(
          String(index),
          monthly.get(`${year}-${String(index).padStart(2, "0")}`) ?? 0,
        );
    return {
      months,
      latest: months.at(-1),
      salaryTotal: salary.reduce((sum, row) => sum + Number(row.amount), 0),
      average: completed.length
        ? completed.reduce((sum, [, value]) => sum + value, 0) /
          completed.length
        : null,
      chart: [...chart]
        .sort((a, b) =>
          year === "all"
            ? a[0].localeCompare(b[0])
            : Number(a[0]) - Number(b[0]),
        )
        .slice(-12)
        .map(([label, amount]) => ({ label, amount })),
    };
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
  const importNames = useMemo(
    () => new Map(data?.imports.map((item) => [item.id, item.filename]) ?? []),
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
                  setPage(0);
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
            {user?.isAdmin && (
              <Button
                onClick={() => setShowImport((value) => !value)}
                aria-expanded={showImport}
                className=""
                type="submit"
              >
                <Upload data-icon="inline-start" />
                ייבוא דוח
              </Button>
            )}
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
        {user?.isAdmin && showImport && (
          <BankImport onImported={invalidateData} />
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
              setPage(0);
            }}
            className="gap-6"
          >
            <FinanceOverview data={data} statistics={statistics} year={year} />
            <TabsList
              id="finance-details"
              aria-label="פירוט הנתונים הכלכליים"
              variant="line"
              className="finance-tabs h-auto w-full flex-wrap justify-start gap-x-4 gap-y-1 border-b"
            >
              {(
                [
                  ["savings", "חיסכון והשקעות"],
                  ["salary", "משכורות"],
                  ["transactions", "תנועות בנק"],
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
                                <Stat
                                  plain
                                  key={item.name}
                                  title={item.name}
                                  value={money(item.value)}
                                />
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
                        <div
                          className="rounded-xl border border-border"
                          tabIndex={0}
                          role="region"
                          aria-label="טבלת נתונים"
                        >
                          <Table className="">
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
            {section === "salary" && (
              <TabsContent value="salary" className="flex flex-col gap-6">
                {
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Stat
                        title="משכורות שחר"
                        value={money(statistics.salaryTotal)}
                      />
                      <Stat
                        title="ממוצע לחודש שהסתיים"
                        value={
                          statistics.average === null
                            ? "—"
                            : money(statistics.average)
                        }
                        detail="חודשים שסכומם שונה מאפס"
                      />
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {year === "all"
                            ? "הכנסות לפי שנים · עד 12 שנים אחרונות"
                            : `הכנסות לפי חודשים · ${year}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SalaryChart data={statistics.chart} />
                      </CardContent>
                    </Card>
                    <Link
                      href="/shahar"
                      className="inline-block text-sm font-semibold text-primary underline"
                    >
                      פירוט המשכורות, המעסיקים ועריכת חודש בעמוד שחר
                    </Link>
                  </>
                }
              </TabsContent>
            )}
            {section === "transactions" && (
              <TabsContent value="transactions" className="flex flex-col gap-6">
                {
                  <Card>
                    <CardHeader className="trend-header">
                      <CardTitle>
                        תנועות בנק · {bank.data?.count ?? "…"}
                      </CardTitle>
                      <CardAction>
                        <Input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          aria-label="חיפוש תנועות"
                          placeholder="תיאור, תאריך או סכום"
                          className={inputStyle}
                        />
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      {bank.error && (
                        <p role="alert" className="text-destructive">
                          {bank.error}
                        </p>
                      )}
                      {bank.loading ? (
                        <p
                          role="status"
                          className="py-10 text-center text-muted-foreground"
                        >
                          טוען תנועות…
                        </p>
                      ) : (
                        <div
                          className="rounded-xl border border-border"
                          tabIndex={0}
                          role="region"
                          aria-label="טבלת נתונים"
                        >
                          <Table className="">
                            <TableHeader>
                              <TableRow>
                                {[
                                  "תאריך",
                                  "תיאור",
                                  "סכום",
                                  "יתרה לאחר הפעולה",
                                  "מקור",
                                ].map((label) => (
                                  <TableHead
                                    key={label}
                                    className="whitespace-nowrap p-3 text-muted-foreground"
                                  >
                                    {label}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bank.data?.rows.map((row) => (
                                <TableRow
                                  key={row.id}
                                  className="border-t border-border"
                                >
                                  <TableCell className="whitespace-nowrap p-3">
                                    {row.date}
                                  </TableCell>
                                  <TableCell className="min-w-52 p-3">
                                    <p>{row.description}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {row.detail}
                                    </p>
                                  </TableCell>
                                  <TableCell
                                    className={
                                      "whitespace-nowrap p-3 tabular-nums " +
                                      (row.amount < 0
                                        ? "text-destructive"
                                        : "text-positive")
                                    }
                                  >
                                    {money(row.amount)}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap p-3 tabular-nums">
                                    {money(row.balance)}
                                  </TableCell>
                                  <TableCell className="p-3 text-xs text-muted-foreground">
                                    {importNames.get(row.import_id)} · עמ׳{" "}
                                    {row.source_page}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {!bank.data?.rows.length && (
                            <p className="py-10 text-center text-muted-foreground">
                              אין תנועות תואמות.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="ui-pagination">
                        <Button
                          className=""
                          disabled={page === 0 || bank.loading}
                          onClick={() => setPage((value) => value - 1)}
                          type="submit"
                          variant="outline"
                        >
                          הקודם
                        </Button>
                        <span>
                          עמוד {page + 1} מתוך{" "}
                          {Math.max(1, Math.ceil((bank.data?.count ?? 0) / 50))}
                        </span>
                        <Button
                          variant="outline"
                          disabled={
                            bank.loading ||
                            (page + 1) * 50 >= (bank.data?.count ?? 0)
                          }
                          onClick={() => setPage((value) => value + 1)}
                          type="submit"
                        >
                          הבא
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
                        <CardTitle>דוחות שיובאו</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {data.imports.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap justify-between gap-2 border-b border-border py-3 text-sm"
                          >
                            <span>{item.filename}</span>
                            <span className="text-muted-foreground">
                              {item.inserted_count} נוספו מתוך {item.row_count}{" "}
                              ·{" "}
                              {new Date(item.imported_at).toLocaleDateString(
                                "he-IL",
                              )}
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
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
                        <p className="mt-4 text-sm text-muted-foreground">
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
