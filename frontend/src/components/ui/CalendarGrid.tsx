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
  restrictedRanges?: { start: string; end: string; reason: string }[];
}

export function CalendarGrid({
  currentMonth,
  setCurrentMonth,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  restrictedRanges = [],
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

  const isDateDisabled = (date: Date) => {
    // 1. Min/Max 제한
    if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) return true;
    if (maxDate && isAfter(startOfDay(date), startOfDay(maxDate))) return true;

    // 2. AI 학습 기간 제한 (Restricted Ranges)
    return restrictedRanges.some((range) => {
      const start = startOfDay(new Date(range.start));
      const end = startOfDay(new Date(range.end));
      const target = startOfDay(date);
      return target >= start && target <= end;
    });
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentYear, currentMonthIndex, day);
    if (!isDateDisabled(newDate)) {
      onSelectDate(newDate);
    }
  };

  const handleMonthChange = (monthIdx: string) => {
    setCurrentMonth(setMonth(currentMonth, parseInt(monthIdx)));
  };

  const handleYearChange = (year: string) => {
    setCurrentMonth(setYear(currentMonth, parseInt(year)));
  };

  // 연도 범위: minDate~maxDate 또는 현재 연도까지만 표시
  const currentActualYear = new Date().getFullYear();
  const minYear = minDate ? getYear(minDate) : currentActualYear - 50;
  const maxYear = maxDate ? getYear(maxDate) : currentActualYear;
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );
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

          // 제한 사유 찾기
          const restrictInfo = restrictedRanges.find((range) => {
            const start = startOfDay(new Date(range.start));
            const end = startOfDay(new Date(range.end));
            const target = startOfDay(date);
            return target >= start && target <= end;
          });

          const isDisabled = isDateDisabled(date) || !!restrictInfo; // isDateDisabled 함수가 있지만 렌더링 최적화를 위해 여기서도 체크 가능하거나 isDateDisabled만 써도 됨.
          // 하지만 위에서 정의한 isDateDisabled 함수를 쓰는게 일관됨.
          // 여기서는 isDateDisabled 함수를 호출하는 것으로 통일.

          const disabledByFunction = isDateDisabled(date);

          const isSelected = selectedDate && isSameDay(date, selectedDate);

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => handleDayClick(dayNum)}
              disabled={disabledByFunction}
              title={restrictInfo ? restrictInfo.reason : undefined}
              className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected &&
                  "bg-primary text-primary-foreground hover:bg-primary",
                disabledByFunction &&
                  "text-muted-foreground opacity-50 pointer-events-none",
                // AI 제한 기간 스타일링 (빨간색 빗금 또는 배경)
                restrictInfo &&
                  "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 line-through decoration-red-500/50"
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
