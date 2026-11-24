"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { compareSavingsMonths, type SavingsMonth } from "../lib/finance";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const currency = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedCurrency = new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "exceptZero" });
const percent = new Intl.NumberFormat("he-IL", { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
const dateLabel = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", year: "numeric", timeZone: "UTC" });

export function SavingsComparison({ snapshots }: { snapshots: SavingsMonth[] }) {
  const id = useId();
  const months = useMemo(() => [...snapshots].sort((a, b) => a.period.localeCompare(b.period)), [snapshots]);
  const [fromPeriod, setFromPeriod] = useState("");
  const [toPeriod, setToPeriod] = useState("");
  const to = months.find((month) => month.period === toPeriod) ?? months.at(-1);
  const from = months.find((month) => month.period === fromPeriod && month.period <= to?.period)
    ?? months.filter((month) => month.period < to?.period).at(-1) ?? to;
  const comparison = from && to ? compareSavingsMonths(months, from.period, to.period) : null;
  const items = [...months].reverse().map((month) => ({ value: month.period, label: month.period }));
  const direction = comparison?.difference > 0 ? "up" : comparison?.difference < 0 ? "down" : "flat";
  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const tone = direction === "up" ? "text-positive" : direction === "down" ? "text-destructive" : "text-foreground";

  return (
    <section aria-labelledby={`${id}-title`} className="mb-6 rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
      <h3 id={`${id}-title`} className="font-medium">השוואת הון בין חודשים</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">בחרו חודש התחלה וחודש סיום. אפשר להשוות גם בין שנים שונות.</p>
      {months.length < 2 || !comparison ? (
        <p className="mt-4 text-sm text-muted-foreground">להשוואה נדרשות יתרות של שני חודשים לפחות.</p>
      ) : (
        <>
          <div className="mt-5 grid min-w-0 gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr]">
            {(["from", "to"] as const).map((endpoint) => {
              const snapshot = endpoint === "from" ? from : to;
              return (
                <div key={endpoint} className="min-w-0">
                  <Label htmlFor={`${id}-${endpoint}`} className="mb-2 text-xs text-muted-foreground">
                    {endpoint === "from" ? "חודש התחלה" : "חודש סיום"}
                  </Label>
                  <Select items={items} value={snapshot.period} onValueChange={(value) => {
                    if (value !== null) (endpoint === "from" ? setFromPeriod : setToPeriod)(String(value));
                  }}>
                    <SelectTrigger id={`${id}-${endpoint}`} className="w-full bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      <SelectGroup>
                        {items.map((item) => (
                          <SelectItem key={item.value} value={item.value}
                            disabled={endpoint === "from" ? item.value > to.period : item.value < from.period}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <p className="mt-3 text-lg font-medium tabular-nums"><bdi>{currency.format(snapshot.total)}</bdi></p>
                  <p className="mt-1 text-xs text-muted-foreground">נכון ל־<time dateTime={snapshot.date}>{dateLabel.format(new Date(`${snapshot.date}T00:00:00Z`))}</time></p>
                </div>
              );
            })}
            <div role="status" aria-live="polite" aria-atomic="true"
              className="flex min-w-0 flex-col justify-center rounded-lg border border-border bg-card p-4 sm:col-span-2 lg:col-span-1">
              <p className={`flex items-center gap-2 text-sm font-medium ${tone}`}>
                <Icon size={18} aria-hidden="true" />
                {direction === "up" ? "ההון גדל" : direction === "down" ? "ההון קטן" : "ללא שינוי בהון"}
              </p>
              <p className={`mt-2 text-[clamp(1.4rem,3vw,2rem)] leading-tight font-semibold tracking-tight tabular-nums ${tone}`}>
                <bdi>{signedCurrency.format(comparison.difference)}</bdi>
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {comparison.percentage === null ? "אחוז שינוי זמין כשהיתרה ההתחלתית חיובית" : <><bdi>{percent.format(comparison.percentage / 100)}</bdi> ביחס לחודש ההתחלה</>}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            לפי סך ההון המדווח בכל תמונת מצב, כולל הפקדות ומשיכות.
            {(from.status !== "verified_cash" || to.status !== "verified_cash") &&
              " ההשוואה כוללת אומדנים או נתונים מתאריכי שווי שונים."}
          </p>
        </>
      )}
    </section>
  );
}
