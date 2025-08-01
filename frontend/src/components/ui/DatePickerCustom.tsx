// frontend/src/components/ui/DatePickerCustom.tsx

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
  endOfMonth,
  addMonths,
  subMonths,
  getMonth,
  getYear,
  setMonth,
  setYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface DatePickerCustomProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  minDate?: Date; // 선택 가능한 최소 날짜
  maxDate?: Date; // 선택 가능한 최대 날짜 (예: 오늘 날짜)
}

export function DatePickerCustom({
  selectedDate,
  onSelectDate,
  disabled,
  className,
  placeholder,
  minDate,
  maxDate = new Date(), // 기본값: 오늘 날짜
}: DatePickerCustomProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selectedDate || maxDate
  );
  const currentYear = getYear(currentMonth);
  const currentMonthIndex = getMonth(currentMonth);

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getDay(startOfMonth(currentMonth)); // 0: 일요일, 1: 월요일, ..., 6: 토요일

  const leadingBlanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
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

  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i); // 현재 년도 기준 앞뒤 50년
  const months = Array.from({ length: 12 }, (_, i) => new Date(currentYear, i));

  const navigateMonth = (direction: -1 | 1) => {
    setCurrentMonth(addMonths(currentMonth, direction));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full pl-3 text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedDate ? (
            format(selectedDate, "PPP")
          ) : (
            <span>{placeholder || "날짜 선택"}</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div>
          {/* 달력 헤더 (월/년도 드롭다운 및 네비게이션) */}
          <div className="flex justify-between items-center relative pb-3">
            <button
              onClick={() => navigateMonth(-1)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-7 w-7 opacity-50 hover:opacity-100"
              )}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex gap-2">
              {/* 년도 선택 드롭다운 */}
              <Select
                value={getYear(currentMonth).toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[125px] h-8 text-sm">
                  {" "}
                  {/* 👈 너비 고정 */}
                  <SelectValue>{getYear(currentMonth)}년</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto bg-popover w-[var(--radix-select-trigger-width)]">
                  {" "}
                  {/* 👈 트리거 너비에 맞춤 */}
                  {years.map((year) => (
                    <SelectItem
                      key={year}
                      value={year.toString()}
                      className="text-center"
                    >
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
                <SelectTrigger className="w-[120px] h-8 text-sm">
                  {" "}
                  {/* 👈 너비 고정 */}
                  <SelectValue>{format(currentMonth, "M월")}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto bg-popover w-[var(--radix-select-trigger-width)]">
                  {" "}
                  {/* 👈 트리거 너비에 맞춤 */}
                  {months.map((month, idx) => (
                    <SelectItem
                      key={idx}
                      value={idx.toString()}
                      className="text-center"
                    >
                      {format(month, "M월")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => navigateMonth(1)}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-7 w-7 opacity-50 hover:opacity-100"
              )}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div
                key={idx}
                className="w-9 h-9 flex items-center justify-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-y-1 mt-1">
            {leadingBlanks.map((_, idx) => (
              <div key={`blank-leading-${idx}`} className="w-9 h-9" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(
              (dayNum) => {
                const date = new Date(currentYear, currentMonthIndex, dayNum);
                const isDisabled =
                  (minDate && isBefore(date, startOfMonth(minDate))) ||
                  (maxDate && isAfter(date, maxDate));
                const isSelected =
                  selectedDate && isSameDay(date, selectedDate);

                return (
                  <button
                    key={dayNum}
                    onClick={() => handleDayClick(dayNum)}
                    disabled={isDisabled}
                    className={cn(
                      "w-9 h-9 rounded-md flex items-center justify-center text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected &&
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      isDisabled &&
                        "text-muted-foreground opacity-50 pointer-events-none"
                    )}
                  >
                    {dayNum}
                  </button>
                );
              }
            )}
            {trailingBlanks.map((_, idx) => (
              <div key={`blank-trailing-${idx}`} className="w-9 h-9" />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
