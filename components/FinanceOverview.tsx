"use client";

import { ArrowLeft, PiggyBank } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import { FinanceData, money, SavingsMonth } from "../lib/finance";
import { personalSalarySummary } from "../lib/income";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

const IncomeComparisonChart = dynamic(() => import("./FinanceCharts.tsx").then((module) => module.IncomeComparisonChart), {
  ssr: false, loading: () => <Skeleton className="h-56" />,
});
const HoldingsChart = dynamic(() => import("./FinanceCharts.tsx").then((module) => module.HoldingsChart), {
  ssr: false, loading: () => <Skeleton className="h-56" />,
});

interface OverviewStatistics {
  latest?: SavingsMonth;
}

const salaryMonthFormatter = new Intl.DateTimeFormat("he-IL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatSalaryMonth(period: string) {
  const [year, month] = period.split("-").map(Number);
  return salaryMonthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function FinanceOverview({ data, statistics, year }: {
  data: FinanceData;
  statistics: OverviewStatistics;
  year: string;
}) {
  const salaries = useMemo(() => personalSalarySummary(data.income, year), [data.income, year]);
  const chartData = salaries.months.slice(-6);
  const holdings = (data.savings?.holdings ?? []).filter((item) => item.value > 0);

  return (
    <>
      <section className="overview-balance" aria-label="סיכום נתונים כספיים">
        <div className="balance-feature">
          <div className="balance-label"><PiggyBank size={19} aria-hidden="true" />שווי החיסכון המשפחתי</div>
          <p className="balance-value">{statistics.latest ? money(statistics.latest.total) : "—"}</p>
          <div className="balance-caption"><span className="balance-chip">תמונת מצב</span><span>{statistics.latest ? `${statistics.latest.date} · כולל אומדנים היסטוריים` : "אין נתונים בתקופה שנבחרה"}</span></div>
        </div>
      </section>

      <div className="overview-chart-grid">
        <Card className="overview-chart-card">
          <CardHeader>
            <CardTitle>משכורות לאורך זמן</CardTitle>
            <CardDescription>עד 6 חודשים אחרונים עם נתונים{year !== "all" ? ` · ${year}` : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length ? <IncomeComparisonChart data={chartData} /> : <div className="chart-empty">אין משכורות בתקופה שנבחרה</div>}
          </CardContent>
        </Card>
        <Card className="overview-chart-card">
          <CardHeader>
            <CardTitle>תיק ההשקעות המשפחתי</CardTitle>
            <CardDescription>{data.savings ? `הרכב התיק · נכון ל־${data.savings.portfolioAsOf}` : "התפלגות ההשקעות שלכם"}</CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length ? <HoldingsChart data={holdings} /> : <div className="chart-empty">עדיין אין נתוני השקעות להצגה</div>}
          </CardContent>
        </Card>
      </div>

      <div className="overview-account-grid">
        {([
          { href: "/kristin", name: "קריסטין", total: salaries.totals.kristin, range: salaries.ranges.kristin, initial: "ק", className: "account-kristin" },
          { href: "/shahar", name: "שחר", total: salaries.totals.shahar, range: salaries.ranges.shahar, initial: "ש", className: "account-shahar" },
        ]).map((account) => (
          <Link key={account.href} href={account.href} className={`account-shortcut ${account.className}`}>
            <div className="account-card-heading"><span className="account-initial" aria-hidden="true">{account.initial}</span><span className="account-card-name">{account.name}</span><ArrowLeft size={17} className="account-card-arrow" aria-hidden="true" /></div>
            <p className="account-card-value">{money(account.total)}</p>
            <p className="account-card-description">
              סך המשכורות
              <br />
              {account.range ? (
                <>
                  מ־<time dateTime={account.range.from}>{formatSalaryMonth(account.range.from)}</time>
                  {" עד "}
                  <time dateTime={account.range.to}>{formatSalaryMonth(account.range.to)}</time>
                </>
              ) : "אין נתונים בתקופה שנבחרה"}
            </p>
            <div className="account-card-footer">לצפייה בהכנסות <ArrowLeft size={14} aria-hidden="true" /></div>
          </Link>
        ))}
      </div>
    </>
  );
}
