"use client";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BarChart3 } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORIES } from "../constants";
import { incomeDateParts } from "../lib/income-date";
import { IncomeType, Transaction } from "../types";
interface TrendsChartProps {
  transactions: Transaction[];
  currentDate: Date;
  onYearChange: (year: number) => void;
}
type View = "months" | "years";
interface ChartPoint {
  name: string;
  fullDate: string;
  CASH: number;
  BIT: number;
  BANK: number;
  total: number;
  count: number;
}
const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});
const monthName = new Intl.DateTimeFormat("he-IL", { month: "short" });
const categories = [IncomeType.BANK, IncomeType.BIT, IncomeType.CASH];
function buildChartData(
  transactions: Transaction[],
  year: number,
  view: View,
  firstYear: number,
) {
  const startYear = Math.max(firstYear, year - 11);
  const data: ChartPoint[] = Array.from(
    { length: view === "months" ? 12 : year - startYear + 1 },
    (_, index) => ({
      name:
        view === "months"
          ? monthName.format(new Date(year, index, 1))
          : String(startYear + index),
      fullDate:
        view === "months"
          ? new Intl.DateTimeFormat("he-IL", {
              month: "long",
              year: "numeric",
            }).format(new Date(year, index, 1))
          : String(startYear + index),
      CASH: 0,
      BIT: 0,
      BANK: 0,
      total: 0,
      count: 0,
    }),
  );
  transactions.forEach((transaction) => {
    // Read the calendar date directly so timezone offsets cannot move it to another month.
    const [transactionYear, month] = transaction.date
      .slice(0, 10)
      .split("-")
      .map(Number);
    const index = view === "months" ? month - 1 : transactionYear - startYear;
    const inRange =
      view === "months"
        ? transactionYear === year
        : transactionYear >= startYear && transactionYear <= year;
    if (
      !inRange ||
      !data[index] ||
      !categories.includes(transaction.type) ||
      !Number.isFinite(transaction.amount)
    )
      return;
    data[index][transaction.type] =
      Math.round((data[index][transaction.type] + transaction.amount) * 100) /
      100;
    data[index].total =
      Math.round((data[index].total + transaction.amount) * 100) / 100;
    data[index].count++;
  });
  return data;
}
function calculateAverages(
  transactions: Transaction[],
  currentMonth: number,
  firstYear: number,
  lastYear: number,
) {
  const months = new Map<
    string,
    {
      year: number;
      total: number;
    }
  >();
  transactions.forEach((transaction) => {
    const [year, month] = transaction.date.slice(0, 10).split("-").map(Number);
    if (
      year < firstYear ||
      year > lastYear ||
      year * 12 + month >= currentMonth
    )
      return;
    if (
      !categories.includes(transaction.type) ||
      !Number.isFinite(transaction.amount)
    )
      return;
    const key = transaction.date.slice(0, 7);
    const entry = months.get(key) ?? { year, total: 0 };
    entry.total = Math.round((entry.total + transaction.amount) * 100) / 100;
    months.set(key, entry);
  });
  const eligibleMonths = Array.from(months.values()).filter(
    (month) => month.total !== 0,
  );
  const total = eligibleMonths.reduce((sum, month) => sum + month.total, 0);
  const yearCount = new Set(eligibleMonths.map((month) => month.year)).size;
  return {
    monthCount: eligibleMonths.length,
    yearCount,
    monthly: eligibleMonths.length ? total / eligibleMonths.length : null,
    yearly: yearCount ? total / yearCount : null,
  };
}
interface TooltipProps {
  active?: boolean;
  payload?: {
    payload: ChartPoint;
  }[];
}
function IncomeTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div
      dir="rtl"
      className="rounded-2xl border border-border bg-popover p-4 text-right shadow-xl"
    >
      <p className="mb-3 font-bold text-foreground">{point.fullDate}</p>
      {categories.map((type) => (
        <div
          key={type}
          className="mb-2 flex items-center justify-between gap-6 text-sm"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CATEGORIES[type].color }}
            />
            {CATEGORIES[type].label}
          </span>
          <span className="tabular-nums text-foreground">
            {currency.format(point[type])}
          </span>
        </div>
      ))}
      <div className="mt-3 flex justify-between gap-6 border-t border-border pt-2 font-bold text-foreground">
        <span>סה״כ</span>
        <span className="tabular-nums">{currency.format(point.total)}</span>
      </div>
    </div>
  );
}
export const TrendsChart: React.FC<TrendsChartProps> = ({
  transactions,
  currentDate,
  onYearChange,
}) => {
  const [view, setView] = useState<View>("months");
  const selectedYear = currentDate.getFullYear();
  const years = useMemo(() => {
    const transactionYears = transactions
      .map((transaction) => Number(transaction.date.slice(0, 4)))
      .filter(Number.isFinite);
    const dates = [
      currentDate.getFullYear(),
      new Date().getFullYear(),
      selectedYear,
      ...transactionYears,
    ];
    const firstYear = Math.min(...dates);
    const lastYear = Math.max(...dates);
    return Array.from(
      { length: lastYear - firstYear + 1 },
      (_, index) => lastYear - index,
    );
  }, [transactions, currentDate, selectedYear]);
  const firstYear = years[years.length - 1];
  const data = useMemo(
    () => buildChartData(transactions, selectedYear, view, firstYear),
    [transactions, selectedYear, view, firstYear],
  );
  const total = data.reduce((sum, point) => sum + point.total, 0);
  const hasTransactions = data.some((point) => point.count > 0);
  const now = incomeDateParts();
  const currentMonth = now.year * 12 + now.month;
  const periodStartYear =
    view === "months" ? selectedYear : Number(data[0].name);
  const periodAverages = useMemo(
    () =>
      calculateAverages(
        transactions,
        currentMonth,
        periodStartYear,
        selectedYear,
      ),
    [transactions, currentMonth, periodStartYear, selectedYear],
  );
  const average =
    view === "months" ? periodAverages.monthly : periodAverages.yearly;
  const periodLabel =
    view === "months"
      ? String(selectedYear)
      : data[0].name + "–" + selectedYear;
  const allYears = useMemo(() => {
    return calculateAverages(transactions, currentMonth, -Infinity, Infinity);
  }, [transactions, currentMonth]);
  const annualAverages = view === "months" ? allYears : periodAverages;
  const summaries = [
    {
      label: view === "months" ? "סה״כ הכנסות בשנה" : "סה״כ הכנסות בתקופה",
      value: total,
      detail: periodLabel,
    },
    {
      label: "ממוצע חודשי",
      value: periodAverages.monthly,
      detail:
        "לפי " +
        periodAverages.monthCount +
        " חודשים שהסתיימו עם הכנסה שונה מאפס",
    },
    {
      label: view === "months" ? "ממוצע שנתי בכל הנתונים" : "ממוצע שנתי בתקופה",
      value: annualAverages.yearly,
      detail:
        "לפי " + annualAverages.yearCount + " שנים עם חודשים שנכללו בחישוב",
    },
  ];
  return (
    <Card>
      <CardHeader className="trend-header">
        <CardTitle>מגמת הכנסות</CardTitle>
        <CardAction>
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              value={[view]}
              onValueChange={(values) => {
                if (values.length) setView(values[0] as View);
              }}
              aria-label="אופן הצגת הגרף"
              variant="outline"
            >
              <ToggleGroupItem value="months">לפי חודשים</ToggleGroupItem>
              <ToggleGroupItem value="years">לפי שנים</ToggleGroupItem>
            </ToggleGroup>
            <Select
              items={years.map((year) => ({
                value: year,
                label: String(year),
              }))}
              value={selectedYear}
              onValueChange={(value) => {
                if (value !== null) onYearChange(Number(value));
              }}
            >
              <SelectTrigger
                aria-label={view === "months" ? "שנה להצגה" : "הצגת שנים עד"}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl
          aria-live="polite"
          className="mb-5 grid gap-4 rounded-xl bg-muted/60 p-5 sm:grid-cols-3"
        >
          {summaries.map((summary) => (
            <div key={summary.label}>
              <dt className="text-[11px] text-muted-foreground">
                {summary.label}
              </dt>
              <dd className="ui-number mt-2 text-2xl font-medium">
                {summary.value === null ? "—" : currency.format(summary.value)}
              </dd>
              <dd className="mt-2 max-w-48 text-[10px] leading-5 text-muted-foreground">
                {summary.detail}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mb-5 text-[11px] leading-6 text-muted-foreground">
          הממוצעים מבוססים על חודשים שהסתיימו וסכומם שונה מאפס. הממוצע השנתי הוא
          סכום החודשים האלה חלקי מספר השנים שבהן נכללו חודשים.
        </p>
        {hasTransactions ? (
          <>
            {average !== null && (
              <p className="mb-2 flex items-center gap-2 text-xs text-primary">
                <span
                  aria-hidden="true"
                  className="w-5 border-t-2 border-dashed border-primary"
                />
                {view === "months" ? "ממוצע חודשי" : "ממוצע שנתי"} ·{" "}
                {currency.format(average)}
              </p>
            )}
            <div
              className="chart-scroll"
              tabIndex={0}
              role="region"
              aria-label={"גרף הכנסות " + periodLabel}
            >
              <div dir="ltr" className="h-[300px] min-w-[560px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    accessibilityLayer
                    margin={{ top: 12, right: 12, left: 0, bottom: 10 }}
                    maxBarSize={36}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      width={64}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      tickFormatter={(value) =>
                        new Intl.NumberFormat("he-IL", {
                          notation: "compact",
                          maximumFractionDigits: 1,
                        }).format(value) + " ₪"
                      }
                    />
                    <Tooltip
                      content={<IncomeTooltip />}
                      cursor={{ fill: "var(--muted)" }}
                    />
                    {average !== null && (
                      <ReferenceLine
                        y={average}
                        stroke="var(--primary)"
                        strokeDasharray="5 5"
                      />
                    )}
                    {categories.map((type) => (
                      <Bar
                        key={type}
                        dataKey={type}
                        name={CATEGORIES[type].label}
                        stackId="income"
                        fill={CATEGORIES[type].color}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground sm:hidden">
              אפשר לגלול את הגרף לצדדים לצפייה בכל העמודות
            </p>
          </>
        ) : (
          <Empty className="min-h-48">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 />
              </EmptyMedia>
              <EmptyTitle>אין הכנסות בתקופה שנבחרה</EmptyTitle>
              <EmptyDescription>
                אפשר לבחור שנה אחרת או להוסיף הכנסה.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        <div
          className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2"
          aria-label="קטגוריות הכנסה"
        >
          {categories.map((type) => (
            <span
              key={type}
              className="flex items-center gap-2 text-[11px] text-muted-foreground"
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: CATEGORIES[type].color }}
              />
              {CATEGORIES[type].label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
