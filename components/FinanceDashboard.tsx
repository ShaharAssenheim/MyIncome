"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BankTransaction, FinanceData, money } from "../lib/finance";
import { seedData, useDataQuery, invalidateData } from "../lib/client-data";
import { useAuth } from "../lib/useAuth";
import { incomeDateParts } from "../lib/income-date";

const SavingsChart = dynamic(
  () => import("./FinanceCharts.tsx").then((module) => module.SavingsChart),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse bg-slate-50" />,
  },
);
const SalaryChart = dynamic(
  () => import("./FinanceCharts.tsx").then((module) => module.SalaryChart),
  {
    ssr: false,
    loading: () => <div className="h-72 animate-pulse bg-slate-50" />,
  },
);
const BankImport = dynamic(() =>
  import("./BankImport.tsx").then((module) => module.BankImport),
);
const card = "ui-panel";
const inputStyle = "ui-input w-auto";
type Section = "savings" | "salary" | "transactions" | "sources";

function Stat({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="ui-card ui-stat">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="my-2 text-2xl font-bold tabular-nums">{value}</p>
      {detail && <p className="text-xs leading-5 text-slate-500">{detail}</p>}
    </div>
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
  const [section, setSection] = useState<Section>("savings");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [monthPage, setMonthPage] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState("");
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
  const bank = useDataQuery<{ rows: BankTransaction[]; count: number }>(
    section === "transactions"
      ? `/api/finance/transactions?year=${year}&page=${page}&search=${encodeURIComponent(debouncedSearch)}`
      : null,
  );
  const data = query.data;
  const statistics = useMemo(() => {
    if (!data) return null;
    const inYear = (date: string) => year === "all" || date.startsWith(year);
    const bankYears = data.bankYears.filter(
      (row) => year === "all" || row.year === Number(year),
    );
    const months = (data.savings?.monthly ?? []).filter(
      (row) => year === "all" || row.year === Number(year),
    );
    const salary = data.income.shahar.filter(
      (row) => inYear(row.date) && row.type === "bank",
    );
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
      latestBank: bankYears.at(-1),
      kristinTotal: data.income.kristin
        .filter((row) => inYear(row.date))
        .reduce((sum, row) => sum + Number(row.amount), 0),
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
      credits: bankYears.reduce((sum, row) => sum + Number(row.credits), 0),
      debits: bankYears.reduce((sum, row) => sum + Number(row.debits), 0),
      net: bankYears.reduce((sum, row) => sum + Number(row.net), 0),
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
    <main id="main-content" className="min-h-screen pb-16 text-slate-900">
      <div className="ui-page space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="ui-page-title">סקירה כללית</h1>
            <p className="mt-2 text-sm text-slate-500">
              הכנסות המשפחה, פעילות הבנק והחיסכון
            </p>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-sm">
              שנה
              <select
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setPage(0);
                  setMonthPage(0);
                }}
                className={inputStyle}
              >
                <option value="all">כל השנים</option>
                {years.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {user?.isAdmin && (
              <button
                onClick={() => setShowImport((value) => !value)}
                aria-expanded={showImport}
                className="ui-btn-primary"
              >
                ייבוא דוח
              </button>
            )}
          </div>
        </div>
        {(query.error || actionError) && (
          <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
            {query.error || actionError}
            <button
              onClick={() => {
                invalidateData();
                setActionError("");
              }}
              className="mr-3 underline"
            >
              ניסיון נוסף
            </button>
          </p>
        )}
        {user?.isAdmin && showImport && (
          <BankImport onImported={invalidateData} />
        )}
        {query.loading && !data && (
          <div
            role="status"
            className="h-48 animate-pulse rounded-2xl bg-slate-200"
          >
            <span className="sr-only">טוען נתונים…</span>
          </div>
        )}
        {data && statistics && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                title="הכנסות Kristin"
                value={money(statistics.kristinTotal)}
              />
              <Stat
                title="העברות בנקאיות Shahar"
                value={money(statistics.salaryTotal)}
                detail="כולל משכורות והתאמות חודשיות"
              />
              <Stat
                title="יתרת עו״ש מדווחת"
                value={
                  statistics.latestBank
                    ? money(statistics.latestBank.balance)
                    : "—"
                }
                detail={statistics.latestBank?.date}
              />
              <Stat
                title="שווי חיסכון היסטורי"
                value={statistics.latest ? money(statistics.latest.total) : "—"}
                detail={
                  statistics.latest
                    ? `${statistics.latest.date} · כולל אומדנים לפי המקור`
                    : undefined
                }
              />
            </div>
            <section className={card}>
              <h2 className="mb-3 font-bold">פעילות חשבון הבנק בתקופה</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat title="זיכויים" value={money(statistics.credits)} />
                <Stat title="חיובים" value={money(statistics.debits)} />
                <Stat title="תזרים נטו" value={money(statistics.net)} />
              </div>
              <p className="mt-4 text-sm text-slate-500">
                פעילות הבנק כוללת משכורות והעברות בין חשבונות. סכומי ההכנסות
                מוצגים בנפרד כדי למנוע ספירה כפולה של העברות Kristin.
              </p>
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["/kristin", "Kristin"],
                ["/shahar", "Shahar"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className={card}>
                  <h2 className="font-bold">{label} ←</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    הכנסות חודשיות, קטגוריות ועריכת סכומים
                  </p>
                </Link>
              ))}
            </div>
            <div role="group" aria-label="סוג הנתונים" className="ui-tabs">
              {(
                [
                  ["savings", "חיסכון והשקעות"],
                  ["salary", "משכורות"],
                  ["transactions", "תנועות בנק"],
                  ["sources", "מקורות ואירועים"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={section === value}
                  onClick={() => {
                    setSection(value);
                    setPage(0);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {section === "savings" && (
              <>
                <section className={card}>
                  <h2 className="font-bold">התפתחות החיסכון</h2>
                  <p className="mb-5 mt-1 text-xs text-slate-500">
                    הפרשי השווי כוללים שינויי השקעות ואומדנים היסטוריים.
                  </p>
                  {statistics.months.length ? (
                    <SavingsChart data={statistics.months} />
                  ) : (
                    <p className="py-10 text-center text-slate-500">
                      אין תמונות מצב בתקופה.
                    </p>
                  )}
                </section>
                {data.savings && (
                  <section className={card}>
                    <h2 className="mb-4 font-bold">
                      תיק השקעות · {data.savings.portfolioAsOf}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {data.savings.holdings.map((item) => (
                        <Stat
                          key={item.name}
                          title={item.name}
                          value={money(item.value)}
                        />
                      ))}
                    </div>
                  </section>
                )}
                <section className={card}>
                  <div className="mb-4 flex justify-between gap-3">
                    <h2 className="font-bold">יתרות חודשיות</h2>
                    <button
                      className="ui-btn-quiet text-indigo-700"
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
                    >
                      ייצוא CSV
                    </button>
                  </div>
                  <div
                    className="ui-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="טבלת נתונים"
                  >
                    <table className="ui-table">
                      <thead>
                        <tr>
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
                            <th
                              key={label}
                              className="p-3 font-medium text-slate-500"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {statistics.months
                          .slice()
                          .reverse()
                          .slice(monthPage * 12, monthPage * 12 + 12)
                          .map((row) => (
                            <tr
                              key={row.period}
                              className="border-t border-slate-100"
                            >
                              <td className="p-3">{row.period}</td>
                              {[
                                row.cash,
                                row.deposit,
                                row.harel,
                                row.ayalon,
                                row.stocks,
                                row.total,
                              ].map((value, index) => (
                                <td key={index} className="p-3 tabular-nums">
                                  {money(value)}
                                </td>
                              ))}
                              <td className="p-3 text-xs">
                                {row.status === "verified_cash"
                                  ? "עו״ש מדווח"
                                  : "כולל אומדן"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="ui-pagination">
                    <button
                      className="ui-btn-secondary"
                      disabled={monthPage === 0}
                      onClick={() => setMonthPage((value) => value - 1)}
                    >
                      הקודם
                    </button>
                    <button
                      className="ui-btn-secondary"
                      disabled={
                        (monthPage + 1) * 12 >= statistics.months.length
                      }
                      onClick={() => setMonthPage((value) => value + 1)}
                    >
                      הבא
                    </button>
                  </div>
                </section>
              </>
            )}
            {section === "salary" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Stat
                    title="העברות בנקאיות ומשכורות"
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
                <section className={card}>
                  <h2 className="mb-5 font-bold">
                    {year === "all"
                      ? "הכנסות לפי שנים · עד 12 שנים אחרונות"
                      : `הכנסות לפי חודשים · ${year}`}
                  </h2>
                  <SalaryChart data={statistics.chart} />
                </section>
                <Link
                  href="/shahar"
                  className="inline-block text-sm font-semibold text-indigo-600 underline"
                >
                  פירוט המשכורות, המעסיקים ועריכת חודש בעמוד Shahar
                </Link>
              </>
            )}
            {section === "transactions" && (
              <section className={card}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-bold">
                    תנועות בנק · {bank.data?.count ?? "…"}
                  </h2>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label="חיפוש תנועות"
                    placeholder="תיאור, תאריך או סכום"
                    className={inputStyle}
                  />
                </div>
                {bank.error && (
                  <p role="alert" className="text-rose-700">
                    {bank.error}
                  </p>
                )}
                {bank.loading ? (
                  <p role="status" className="py-10 text-center text-slate-500">
                    טוען תנועות…
                  </p>
                ) : (
                  <div
                    className="ui-table-scroll"
                    tabIndex={0}
                    role="region"
                    aria-label="טבלת נתונים"
                  >
                    <table className="ui-table">
                      <thead>
                        <tr>
                          {[
                            "תאריך",
                            "תיאור",
                            "סכום",
                            "יתרה לאחר הפעולה",
                            "מקור",
                          ].map((label) => (
                            <th
                              key={label}
                              className="whitespace-nowrap p-3 text-slate-500"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bank.data?.rows.map((row) => (
                          <tr
                            key={row.id}
                            className="border-t border-slate-100"
                          >
                            <td className="whitespace-nowrap p-3">
                              {row.date}
                            </td>
                            <td className="min-w-52 p-3">
                              <p>{row.description}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {row.detail}
                              </p>
                            </td>
                            <td
                              className={
                                "whitespace-nowrap p-3 tabular-nums " +
                                (row.amount < 0
                                  ? "text-rose-700"
                                  : "text-emerald-700")
                              }
                            >
                              {money(row.amount)}
                            </td>
                            <td className="whitespace-nowrap p-3 tabular-nums">
                              {money(row.balance)}
                            </td>
                            <td className="p-3 text-xs text-slate-500">
                              {importNames.get(row.import_id)} · עמ׳{" "}
                              {row.source_page}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!bank.data?.rows.length && (
                      <p className="py-10 text-center text-slate-500">
                        אין תנועות תואמות.
                      </p>
                    )}
                  </div>
                )}
                <div className="ui-pagination">
                  <button
                    className="ui-btn-secondary"
                    disabled={page === 0 || bank.loading}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    הקודם
                  </button>
                  <span>
                    עמוד {page + 1} מתוך{" "}
                    {Math.max(1, Math.ceil((bank.data?.count ?? 0) / 50))}
                  </span>
                  <button
                    className={inputStyle}
                    disabled={
                      bank.loading || (page + 1) * 50 >= (bank.data?.count ?? 0)
                    }
                    onClick={() => setPage((value) => value + 1)}
                  >
                    הבא
                  </button>
                </div>
              </section>
            )}
            {section === "sources" && (
              <>
                {sourceDifferences.length > 0 && (
                  <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <h2 className="mb-3 font-bold">
                      פערים בין מקור החיסכון לדוחות הבנק
                    </h2>
                    {sourceDifferences.map((row) => (
                      <p key={row.period} className="text-sm leading-7">
                        {row.period} · במקור {money(row.original)} · בדוח{" "}
                        {money(row.reported)}
                      </p>
                    ))}
                  </section>
                )}
                <section className={card}>
                  <h2 className="mb-4 font-bold">דוחות שיובאו</h2>
                  {data.imports.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-3 text-sm"
                    >
                      <span>{item.filename}</span>
                      <span className="text-slate-500">
                        {item.inserted_count} נוספו מתוך {item.row_count} ·{" "}
                        {new Date(item.imported_at).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                  ))}
                </section>
                <section className={card}>
                  <h2 className="mb-4 font-bold">אירועים והעברות בחיסכון</h2>
                  {data.savings?.events
                    .filter(
                      (event) => year === "all" || event.date.startsWith(year),
                    )
                    .slice()
                    .reverse()
                    .map((event, index) => (
                      <article
                        key={index}
                        className="border-b border-slate-100 py-4"
                      >
                        <p className="text-xs text-slate-500">{event.date}</p>
                        <h3 className="my-2 font-semibold">
                          {event.title} · {money(event.amount)}
                        </h3>
                        <p className="text-sm text-slate-600">{event.detail}</p>
                      </article>
                    ))}
                </section>
                <section className={card}>
                  <h2 className="mb-4 font-bold">מקורות ורמת הדיוק</h2>
                  <ul className="list-inside list-disc space-y-3 text-sm leading-6 text-slate-600">
                    {data.savings?.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm text-slate-500">
                    {data.savings?.sources.join(" · ")}
                  </p>
                  <button
                    disabled={exporting}
                    onClick={exportAll}
                    className="ui-btn-secondary mt-5"
                  >
                    {exporting ? "מייצא…" : "ייצוא כל הנתונים"}
                  </button>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
