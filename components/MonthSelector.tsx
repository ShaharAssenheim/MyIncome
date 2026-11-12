"use client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
export function MonthSelector({
  currentDate,
  onPrevMonth,
  onNextMonth,
}: {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-1 rounded-lg bg-muted p-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onPrevMonth}
        aria-label="חודש קודם"
      >
        <ChevronRight />
      </Button>
      <h2
        className="flex min-w-36 items-center justify-center gap-2 px-2 text-sm font-medium"
        aria-live="polite"
      >
        <CalendarDays size={15} className="text-primary" aria-hidden="true" />
        {new Intl.DateTimeFormat("he-IL", {
          month: "long",
          year: "numeric",
        }).format(currentDate)}
      </h2>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onNextMonth}
        aria-label="חודש הבא"
      >
        <ChevronLeft />
      </Button>
    </div>
  );
}
