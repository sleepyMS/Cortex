// file: frontend/src/components/ui/CalendarGrid.tsx

"use client";

import * as React from "react";
import {
  format,
  getDaysInMonth,
  getDay,
  isBefore,
  isAfter,
  isSameDay,
  startOfMonth,
  addMonths,
  getMonth,
  getYear,
  setMonth,
  setYear,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface CalendarGridProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

export function CalendarGrid({
  currentMonth,
  setCurrentMonth,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
}: CalendarGridProps) {
  const currentYear = getYear(currentMonth);
  const currentMonthIndex = getMonth(currentMonth);

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getDay(startOfMonth(currentMonth)); // 0: 일요일, ..., 6: 토요일

  const leadingBlanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  // 달력 그리드를 항상 6주(42일)로 고정하여 UI가 깨지지 않도록 함
  const trailingBlanks = Array.from(
    { length: 42 - (leadingBlanks.length + daysInMonth) },
    (_, i) => null
  );

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonthIndex, day);
    onSelectDate(newDate);
  };

  const handleMonthChange = (monthIdx: string) => {
    setCurrentMonth(setMonth(currentMonth, parseInt(monthIdx)));
  };

  const handleYearChange = (year: string) => {
    setCurrentMonth(setYear(currentMonth, parseInt(year)));
  };

  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);
  const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i));

  const navigateMonth = (direction: -1 | 1) => {
    setCurrentMonth(addMonths(currentMonth, direction));
  };

  return (
    <div className="p-3">
      {/* 달력 헤더 (월/년도 드롭다운 및 네비게이션) */}
      <div className="flex justify-between items-center relative pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(-1)}
          className="h-7 w-7 opacity-50 hover:opacity-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex gap-2">
          {/* 년도 선택 드롭다운 */}
          <Select
            value={getYear(currentMonth).toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[110px] h-8 text-sm focus:ring-0">
              <SelectValue>{getYear(currentMonth)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {/* ▼▼▼ [수정] 생략되었던 년도 옵션 렌더링 코드 ▼▼▼ */}
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}년
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* 월 선택 드롭다운 */}
          <Select
            value={getMonth(currentMonth).toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[90px] h-8 text-sm focus:ring-0">
              <SelectValue>{format(currentMonth, "M")}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {/* ▼▼▼ [수정] 생략되었던 월 옵션 렌더링 코드 ▼▼▼ */}
              {months.map((month, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {format(month, "M월")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigateMonth(1)}
          className="h-7 w-7 opacity-50 hover:opacity-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div key={day} className="w-9 h-9 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1 mt-1">
        {leadingBlanks.map((_, idx) => (
          <div key={`blank-leading-${idx}`} className="w-9 h-9" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
          const date = new Date(currentYear, currentMonthIndex, dayNum);
          const startOfMinDate = minDate ? startOfDay(minDate) : null;
          const isDisabled =
            (startOfMinDate && isBefore(date, startOfMinDate)) ||
            (maxDate && isAfter(date, maxDate));
          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => handleDayClick(dayNum)}
              disabled={isDisabled}
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary",
                isDisabled &&
                  "text-muted-foreground opacity-50 pointer-events-none"
              )}
            >
              {dayNum}
            </button>
          );
        })}
        {trailingBlanks.map((_, idx) => (
          <div key={`blank-trailing-${idx}`} className="w-9 h-9" />
        ))}
      </div>
    </div>
  );
}
