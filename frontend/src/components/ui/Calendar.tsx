// frontend/src/components/ui/Calendar.tsx

"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, useDayPicker, type DayPickerProps } from "react-day-picker";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

// Nav 컴포넌트의 props 타입 재정의
interface CustomNavProps extends React.HTMLAttributes<HTMLDivElement> {
  onPreviousClick?: React.MouseEventHandler<HTMLButtonElement>;
  onNextClick?: React.MouseEventHandler<HTMLButtonElement>;
  previousMonth?: Date;
  nextMonth?: Date;
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// --- Custom Nav 컴포넌트 ---
function CalendarNav({
  onPreviousClick,
  onNextClick,
  previousMonth,
  nextMonth,
  ...props
}: CustomNavProps) {
  const { displayMonth, goToMonth } = useDayPicker() as any;

  // 👈 displayMonth가 undefined일 경우를 대비한 방어적 코드
  // 이 오류가 발생했다는 것은 displayMonth가 예상과 달리 undefined임을 의미합니다.
  if (!displayMonth) {
    // 적절한 대체 (예: 현재 날짜) 또는 오류 UI 렌더링
    // 여기서는 렌더링을 피하거나 로딩 상태를 표시할 수 있습니다.
    return (
      <div className="text-destructive-foreground">
        Error: Calendar data not available.
      </div>
    );
  }

  const handleMonthChange = (monthValue: string) => {
    const newMonth = new Date(displayMonth.getFullYear(), parseInt(monthValue));
    goToMonth(newMonth);
  };

  const handleYearChange = (yearValue: string) => {
    const newYear = new Date(parseInt(yearValue), displayMonth.getMonth());
    goToMonth(newYear);
  };

  const currentYear = displayMonth.getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i);

  return (
    <div
      className={cn(
        "flex justify-center items-center relative py-2 px-4",
        props.className
      )}
    >
      {/* 이전 달 버튼 */}
      <button
        type="button"
        onClick={onPreviousClick}
        disabled={!previousMonth || !onPreviousClick}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* 월/년도 선택 드롭다운 */}
      <div className="flex gap-2">
        {/* 월 선택 드롭다운 */}
        <Select
          value={displayMonth.getMonth().toString()}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="w-[110px] h-8 text-sm">
            <SelectValue>{format(displayMonth, "M월")}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {format(new Date(displayMonth.getFullYear(), i), "M월")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 년도 선택 드롭다운 */}
        <Select
          value={displayMonth.getFullYear().toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-[100px] h-8 text-sm">
            <SelectValue>{displayMonth.getFullYear()}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[200px] overflow-y-auto">
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 다음 달 버튼 */}
      <button
        type="button"
        onClick={onNextClick}
        disabled={!nextMonth || !onNextClick}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "hidden",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "day-outside text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50 pointer-events-none",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Nav: CalendarNav,
      }}
      captionLayout="dropdown"
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
