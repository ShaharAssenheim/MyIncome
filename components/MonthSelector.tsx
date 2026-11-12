"use client";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-1.5">
      <button
        type="button"
        onClick={onPrevMonth}
        className="ui-icon-btn"
        aria-label="חודש קודם"
        title="חודש קודם"
      >
        <ChevronRight size={19} />
      </button>
      <div className="flex items-center justify-center gap-2.5 px-2">
        <CalendarDays
          size={17}
          className="text-indigo-500"
          aria-hidden="true"
        />
        <h2
          className="whitespace-nowrap text-sm font-semibold text-slate-800"
          aria-live="polite"
        >
          {new Intl.DateTimeFormat("he-IL", {
            month: "long",
            year: "numeric",
          }).format(currentDate)}
        </h2>
      </div>
      <button
        type="button"
        onClick={onNextMonth}
        className="ui-icon-btn"
        aria-label="חודש הבא"
        title="חודש הבא"
      >
        <ChevronLeft size={19} />
      </button>
    </div>
  );
}
