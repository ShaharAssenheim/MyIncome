"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
const currency = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
});

export function SummaryPie({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="65%"
          outerRadius="90%"
          paddingAngle={4}
          dataKey="value"
          stroke="none"
          cornerRadius={4}
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.color}
              className="stroke-hero stroke-[3px]"
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => currency.format(Number(value))}
          contentStyle={{
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            color: "var(--foreground)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
