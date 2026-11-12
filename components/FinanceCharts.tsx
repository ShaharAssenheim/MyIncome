"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
        <LineChart data={data} accessibilityLayer>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
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
          <Tooltip formatter={(value) => money(Number(value))} />
          <Line
            name="סך חיסכון"
            dataKey="total"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
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
            <Tooltip formatter={(value) => money(Number(value))} />
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
