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
export function SalaryChart({
  data,
}: {
  data: { label: string; amount: number }[];
}) {
  return (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="גרף משכורות, ניתן לגלול לרוחב"
    >
      <div dir="ltr" className="h-72 min-w-[500px]">
        <ResponsiveContainer>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
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
            <Bar
              name="משכורות"
              dataKey="amount"
              fill="var(--primary)"
              maxBarSize={36}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", boxShadow: "0 8px 28px #24466b12", fontSize: 12, direction: "rtl" as const };

export function IncomeComparisonChart({ data }: { data: { period: string; kristin: number; shahar: number }[] }) {
  return (
    <div>
      <div className="chart-legend"><span><i style={{ background: "var(--chart-1)" }} />קריסטין</span><span><i style={{ background: "var(--chart-2)" }} />שחר</span></div>
      <div dir="ltr" className="h-52" role="img" aria-label="השוואת משכורות חודשיות של קריסטין ושל שחר">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} accessibilityLayer barGap={5} margin={{ top: 10, left: -10, right: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="income-green" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#66DC97" /><stop offset="1" stopColor="#0BB68D" /></linearGradient>
              <linearGradient id="income-blue" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#82BEFF" /><stop offset="1" stopColor="#438DF3" /></linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(value: string) => `${value.slice(5)}/${value.slice(2, 4)}`} dy={7} />
            <YAxis width={58} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(value) => new Intl.NumberFormat("he-IL", { notation: "compact", maximumFractionDigits: 1 }).format(value)} />
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
            <Bar name="קריסטין" dataKey="kristin" fill="url(#income-green)" radius={[5, 5, 0, 0]} maxBarSize={27} isAnimationActive={false} />
            <Bar name="שחר" dataKey="shahar" fill="url(#income-blue)" radius={[5, 5, 0, 0]} maxBarSize={27} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const holdingColors = ["#21C89D", "#5B9CF6", "#AB85F5", "#FFCB62", "#EB93D5", "#C6D2FF"];

export function HoldingsChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="holdings-layout">
      <div className="holdings-donut" role="img" aria-label={`הרכב תיק ההשקעות, סך הכל ${money(total)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="69%" outerRadius="94%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>
              {data.map((item, index) => <Cell key={item.name} fill={holdingColors[index % holdingColors.length]} />)}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value))} contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="holdings-center"><strong>{money(total)}</strong><span>סך ההשקעות</span></div>
      </div>
      <ul className="holdings-legend">
        {data.map((item, index) => <li key={item.name}><i style={{ background: holdingColors[index % holdingColors.length] }} /><span>{item.name}</span><span className="holding-percent">{total ? (item.value / total * 100).toFixed(1) : "0"}%</span><strong>{money(item.value)}</strong></li>)}
      </ul>
    </div>
  );
}
