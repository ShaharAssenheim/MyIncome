"use client";

import { PiggyBank } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { familyPortfolio, FinanceData, money, SavingsMonth } from "../lib/finance";
import { incomeDateParts } from "../lib/income-date";
import { combinedSalaryTimeline, personalSalarySummary } from "../lib/income";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { RetirementSection } from "./RetirementSection";

const CombinedIncomeChart = dynamic(() => import("./FinanceCharts.tsx").then((module) => module.CombinedIncomeChart), {
  ssr: false, loading: () => <Skeleton className="h-56" />,
});
const HoldingsChart = dynamic(() => import("./FinanceCharts.tsx").then((module) => module.HoldingsChart), {
  ssr: false, loading: () => <Skeleton className="h-56" />,
});

interface OverviewStatistics {
  latest?: SavingsMonth;
}

export function FinanceOverview({ data, statistics }: {
  data: FinanceData;
  statistics: OverviewStatistics;
}) {
  const today = incomeDateParts();
  const currentYear = String(today.year);
  const currentPeriod = `${currentYear}-${String(today.month).padStart(2, "0")}`;
  const [chartYear, setChartYear] = useState(currentYear);
  const chartSalaries = useMemo(() => personalSalarySummary(data.income), [data.income]);
  const chartYears = useMemo(() => [...new Set([
    currentYear,
    ...chartSalaries.months.map((month) => month.period.slice(0, 4)),
  ])].sort().reverse(), [currentYear, chartSalaries.months]);
  const chartData = useMemo(() => combinedSalaryTimeline(chartSalaries.months, chartYear, currentPeriod), [chartSalaries.months, chartYear, currentPeriod]);
  const annualAverage = chartData[0]?.annualAverage;
  const { holdings, cash } = useMemo(() => familyPortfolio(data), [data.savings, data.bankYears]);

  return (
    <>
      <section className="overview-balance" aria-label="סיכום נתונים כספיים">
        <div className="balance-feature">
          <div className="balance-label"><PiggyBank size={19} aria-hidden="true" />שווי החיסכון המשפחתי</div>
          <p className="balance-value">{statistics.latest ? money(statistics.latest.total) : "—"}</p>
          <div className="balance-caption"><span className="balance-chip">תמונת מצב</span><span>{statistics.latest ? `${statistics.latest.date} · כולל אומדנים היסטוריים` : "אין נתונים בתקופה שנבחרה"}</span></div>
        </div>
      </section>

      <RetirementSection />

      <div className="overview-chart-grid">
        <Card className="overview-chart-card min-w-0">
          <CardHeader>
            <CardTitle>משכורות לאורך זמן</CardTitle>
            <CardDescription>
              ממוצע חודשי בשנת {chartYear}: {annualAverage == null ? "—" : money(annualAverage)}
              <span className="block">לפי חודשים שהסתיימו ויש בהם נתוני משכורת</span>
            </CardDescription>
            <CardAction>
              <Select
                items={chartYears.map((value) => ({ value, label: value }))}
                value={chartYear}
                onValueChange={(value) => {
                  if (value !== null) setChartYear(String(value));
                }}
              >
                <SelectTrigger size="sm" aria-label="שנה לגרף המשכורות" className="min-w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {chartYears.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent>
            <CombinedIncomeChart data={chartData} />
          </CardContent>
        </Card>
        <Card className="overview-chart-card">
          <CardHeader>
            <CardTitle>תיק ההשקעות המשפחתי</CardTitle>
            <CardDescription>
              {data.savings ? `השקעות · נכון ל־${data.savings.portfolioAsOf}` : "התפלגות הנכסים שלכם"}
              {cash && <span className="block">עו״ש · נכון ל־{cash.date}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {holdings.length ? <HoldingsChart data={holdings} /> : <div className="chart-empty">עדיין אין נתוני השקעות להצגה</div>}
          </CardContent>
        </Card>
      </div>

    </>
  );
}
