"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, SavingsMonth } from "../lib/finance";

export function SavingsChart({ data }: { data: SavingsMonth[] }) {
  return (
    <div
      dir="ltr"
      className="h-72"
      role="img"
      aria-label="התפתחות החיסכון לאורך התקופה"
    >
      <ResponsiveContainer>
        <AreaChart data={data} accessibilityLayer margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
          <defs><linearGradient id="savings-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.27} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0.015} /></linearGradient></defs>
          <CartesianGrid
            stroke="var(--border)"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            minTickGap={35}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            width={65}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
          <Area
            type="monotone"
            name="סך חיסכון"
            dataKey="total"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#savings-fill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 8px 28px #24466b12", fontSize: 12, direction: "rtl" as const };

export function CombinedIncomeChart({ data }: { data: { period: string; total: number | null; shahar: number | null; kristin: number | null }[] }) {
  return (
    <div>
      <div className="chart-legend flex-wrap">
        <span><i style={{ background: "var(--chart-1)" }} />הכנסה משותפת</span>
      </div>
      <div dir="ltr" className="overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="הכנסה חודשית משותפת מינואר עד דצמבר, ניתן לגלול לרוחב">
      <div className="h-52 min-w-[720px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} accessibilityLayer margin={{ top: 10, left: -10, right: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="income-green" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#66DC97" /><stop offset="1" stopColor="#0BB68D" /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="period" interval={0} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(value: string) => `${value.slice(5)}/${value.slice(2, 4)}`} dy={7} />
            <YAxis width={58} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(value) => new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(value)} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload }) => {
                const month = payload?.[0]?.payload;
                if (!active || month?.total == null) return null;
                return (
                  <div dir="rtl" style={{ ...tooltipStyle, background: "var(--popover)", color: "var(--popover-foreground)", padding: "10px 12px" }}>
                    <p className="mb-2">חודש {month.period.slice(5)}/{month.period.slice(0, 4)}</p>
                    <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1">
                      <dt>שחר</dt><dd dir="ltr" className="text-left tabular-nums">{money(month.shahar)}</dd>
                      <dt>קריסטין</dt><dd dir="ltr" className="text-left tabular-nums">{money(month.kristin)}</dd>
                      <dt className="border-t border-border pt-2 font-semibold">הכנסה משותפת</dt><dd dir="ltr" className="border-t border-border pt-2 text-left font-semibold tabular-nums">{money(month.total)}</dd>
                    </dl>
                  </div>
                );
              }}
            />
            <Bar name="הכנסה משותפת" dataKey="total" fill="url(#income-green)" radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}

const holdingColors = ["#21C89D", "#5B9CF6", "#AB85F5", "#FFCB62", "#EB93D5", "#C6D2FF"];

export function HoldingsChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + Math.round(item.value * 100), 0) / 100;
  const positiveTotal = data.reduce((sum, item) => sum + Math.max(0, Math.round(item.value * 100)), 0) / 100;
  return (
    <div className="holdings-layout">
      <div className="holdings-donut" role="img" aria-label={`הרכב תיק ההשקעות כולל עו״ש, סך הכל ${money(total)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.map((item) => ({ ...item, value: Math.max(0, item.value) }))} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="94%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
              {data.map((item, index) => <Cell key={item.name} fill={holdingColors[index % holdingColors.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="holdings-center"><strong>{money(total)}</strong><span>סך התיק כולל עו״ש</span></div>
      </div>
      <ul className="holdings-legend">
        {data.map((item, index) => <li key={item.name}><i style={{ background: holdingColors[index % holdingColors.length] }} /><span>{item.name}</span><span className="holding-percent">{item.value < 0 ? "—" : `${positiveTotal ? (item.value / positiveTotal * 100).toFixed(1) : "0"}%`}</span><strong>{money(item.value)}</strong></li>)}
      </ul>
    </div>
  );
}
