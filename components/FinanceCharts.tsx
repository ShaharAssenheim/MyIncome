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
            stroke="#edf0f6"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            minTickGap={35}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            width={65}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickFormatter={(value) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip formatter={(value) => money(Number(value))} />
          <Line
            name="סך חיסכון"
            dataKey="total"
            stroke="#4f46e5"
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
              stroke="#edf0f6"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
            />
            <YAxis
              width={65}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickFormatter={(value) => `${Math.round(value / 1000)}k`}
            />
            <Tooltip formatter={(value) => money(Number(value))} />
            <Bar
              name="משכורות"
              dataKey="amount"
              fill="#4f46e5"
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
