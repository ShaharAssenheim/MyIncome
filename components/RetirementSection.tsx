"use client";

import Link from "next/link";
import { useId } from "react";
import { useDataQuery } from "../lib/client-data";
import { retirementPersonNames, retirementProductNames, retirementSummary, retirementYears,
  type RetirementData, type RetirementPerson, type RetirementProduct } from "../lib/retirement";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

const amount = (value: number, rounded = false) => new Intl.NumberFormat("he-IL", {
  style: "currency", currency: "ILS", minimumFractionDigits: rounded ? 0 : 2, maximumFractionDigits: rounded ? 0 : 2,
}).format(value);
const date = (value: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeZone: "UTC" }).format(new Date(value + "T00:00:00Z"));
const products: RetirementProduct[] = ["pension", "study_fund"];

function AnnualDetails({ data, person, product }: { data: RetirementData; person: RetirementPerson; product: RetirementProduct }) {
  const years = retirementYears(data, person, product);
  if (!years.length) return null;
  return (
    <details className="rounded-xl border border-border bg-card px-4 sm:px-5">
      <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">{retirementProductNames[product]} · יתרות שנתיות, הפקדות ותשואות</summary>
      <div className="pb-5">
        <p className="mb-4 text-xs leading-6 text-muted-foreground">
          ההפקדות לפי מועד קליטת הכסף בקרן, גם אם חודש השכר שייך לשנה קודמת. רווחי ההשקעה אחרי הוצאות השקעה ולפני דמי ניהול וביטוח.
          הצמיחה נטו כוללת גם דמי ניהול, החזרים, ביטוח ואיזון אקטוארי. העברות ותיקוני יתרות מוצגים בנפרד.
          סיווג רכיבי ההפקדה נשמר מהדוח; תנועות המסומנות ריסק מצבירה אינן בהכרח כסף חדש מהשכר.
        </p>
        <Table aria-label={`${retirementProductNames[product]} של ${retirementPersonNames[person]} לפי שנים`}>
          <TableHeader><TableRow>
            {["שנה", "חברה", "יתרה בסוף התקופה", "הפקדות עובד", "תגמולי מעסיק", "פיצויי מעסיק", "סך הפקדות מדווח", "רווחי השקעה", "צמיחה נטו", "העברות נטו", "תיקון יתרה"].map((title) => <TableHead key={title}>{title}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>{[...years].reverse().map((row) => <TableRow key={row.year}>
            <TableCell className="font-medium">{row.year}{row.partial && <span className="block text-xs text-muted-foreground">עד {date(row.dates.at(-1)!)}</span>}{row.missingAccounts.length > 0 && <span className="block text-xs text-destructive">מידע חלקי</span>}</TableCell>
            <TableCell>{[...new Set(row.reports.map((report) => data.accounts.find((a) => a.id === report.account_id)!.provider))].join(" + ")}</TableCell>
            {[row.closing_balance, row.employee_contributions, row.employer_contributions, row.severance_contributions,
              row.contributions_total, row.investment_gains, row.netGrowth, row.transfers_in - row.transfers_out, row.balance_adjustment]
              .map((value, index) => <TableCell key={index} className="tabular-nums"><bdi>{amount(value, row.rounded)}</bdi></TableCell>)}
          </TableRow>)}</TableBody>
        </Table>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">תקופה חלקית אינה שנה מלאה. סכומים מדוחות רבעוניים מעוגלים לשקל; סך ההפקדות המדווח עשוי להיות שונה מסכום הרכיבים המעוגלים. הדוחות האחרונים של הקרנות עשויים להיות מתאריכים שונים.</p>
        <details className="mt-4 border-t border-border pt-1">
          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">פירוט הקרנות, עלויות ומקורות</summary>
          <div className="space-y-5 pt-2">
            {[...years].reverse().map((year) => <div key={year.year}>
              <h4 className="mb-2 font-medium">{year.year}</h4>
              {year.missingAccounts.length > 0 && <p className="mb-2 text-sm text-destructive">חסרים דוחות: {year.missingAccounts.join(" · ")}</p>}
              {year.reports.map((report) => <div key={report.id} className="mt-3 rounded-lg bg-muted/40 p-3 text-xs leading-6">
                <p className="font-medium">{data.accounts.find((a) => a.id === report.account_id)!.name} · עד {date(report.period_end)}</p>
                <p>יתרה: <bdi>{amount(report.closing_balance, year.rounded)}</bdi> · דמי ניהול: <bdi>{amount(report.management_fees, year.rounded)}</bdi> · החזרי דמי ניהול: <bdi>{amount(report.fee_refunds, year.rounded)}</bdi></p>
                <p>ביטוח נכות: <bdi>{amount(report.disability_cost, year.rounded)}</bdi> · ביטוח שאירים: <bdi>{amount(report.survivor_cost, year.rounded)}</bdi> · איזון אקטוארי: <bdi>{amount(report.actuarial_adjustment, year.rounded)}</bdi></p>
                <p>העברות פנימה: <bdi>{amount(report.transfers_in, year.rounded)}</bdi> · החוצה: <bdi>{amount(report.transfers_out, year.rounded)}</bdi></p>
                <p className="mt-1 text-muted-foreground [overflow-wrap:anywhere]">מקור: {report.source_file} · עמודים {report.source_pages.join(", ")}</p>
                {report.notes.map((note) => <p key={note} className="mt-1 text-muted-foreground">{note}</p>)}
              </div>)}
            </div>)}
          </div>
        </details>
      </div>
    </details>
  );
}

export function RetirementSection({ person, initialData }: { person?: RetirementPerson; initialData?: RetirementData }) {
  const id = useId();
  const query = useDataQuery<RetirementData>("/api/retirement", initialData);
  return (
    <section id={person ? "retirement" : undefined} aria-labelledby={`${id}-title`} className="min-w-0 scroll-mt-24 space-y-4">
      <div>
        <h2 id={`${id}-title`} className="text-lg font-semibold">פנסיה וקרן השתלמות{person ? ` של ${retirementPersonNames[person]}` : ""}</h2>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">יתרות מהדוחות שצורפו, בנפרד מהחיסכון וההשקעות שבטבלת היתרות החודשיות. {person && "הנתונים אינם משתנים לפי חודש ההכנסה הנבחר."}</p>
      </div>
      {query.error ? <Alert variant="destructive"><AlertDescription>{query.error}<Button variant="outline" size="sm" className="ms-3" onClick={query.reload}>נסו שוב</Button></AlertDescription></Alert> : query.loading && !query.data ? (
        <div role="status" aria-label="טוען פנסיה וקרן השתלמות" className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : query.data && <>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">{products.map((product) => {
          const summary = retirementSummary(query.data!, product, person);
          return <Card key={product} className="min-w-0">
            <CardHeader><CardTitle>{retirementProductNames[product]}</CardTitle>
              <CardDescription>{summary.balance === null ? "טרם צורפו דוחות" : summary.dates.length === 1 ? `נכון ל־${date(summary.dates[0])}` : `דוחות מתאריכים שונים: ${summary.dates.map(date).join(" · ")}`}</CardDescription></CardHeader>
            <CardContent>
              <p className="text-[clamp(1.5rem,6vw,2rem)] font-semibold tabular-nums"><bdi>{summary.balance === null ? "אין נתונים" : amount(summary.balance, summary.rounded)}</bdi></p>
              {summary.missingPeople.length > 0 && <p className="mt-2 text-xs leading-6 text-muted-foreground">חסרים נתוני {summary.missingPeople.map((p) => retirementPersonNames[p]).join(" ו")}{summary.balance !== null && "; הסכום כולל רק את הנתונים שצורפו"}.</p>}
              {summary.missingAccounts.length > 0 && <p className="mt-2 text-xs text-muted-foreground">חסרים דוחות: {summary.missingAccounts.join(" · ")}</p>}
              {summary.accounts.filter(({ report }) => report && report.closing_balance !== 0).map(({ account, report }) => <p key={account.id} className="mt-2 text-xs leading-6 text-muted-foreground">{!person && `${retirementPersonNames[account.person]} · `}{account.name} · <bdi>{amount(report.closing_balance, report.reported_precision === 0)}</bdi></p>)}
            </CardContent>
          </Card>;
        })}</div>
        {person ? <>
          {products.map((product) => <AnnualDetails key={product} data={query.data!} person={person} product={product} />)}
          {query.data.accounts.filter((a) => a.person === person).some((a) => a.notes.length > 0) && <details className="rounded-xl border border-border bg-card px-4 sm:px-5">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">מעבר בין חברות ומידע חסר</summary>
            <ul className="list-inside list-disc space-y-2 pb-4 text-xs leading-6 text-muted-foreground">{query.data.accounts.filter((a) => a.person === person).map((account) => <li key={account.id}>{account.name}{account.joined_on && ` · הצטרפות ${date(account.joined_on)}`}{account.notes.map((note) => <p className="mt-1" key={note}>{note}</p>)}</li>)}</ul>
          </details>}
        </> : <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">{(["shahar", "kristin"] as const).map((p) => <Link key={p} href={`/${p}#retirement`} className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">לפירוט של {retirementPersonNames[p]}</Link>)}</div>}
      </>}
    </section>
  );
}
