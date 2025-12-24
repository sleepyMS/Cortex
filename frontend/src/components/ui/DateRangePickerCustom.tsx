// file: frontend/src/components/ui/DateRangePickerCustom.tsx

"use client";

import * as React from "react";
import { format, addDays, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight, ArrowDown } from "lucide-react"; // ArrowDown 아이콘 추가
import { ko } from "date-fns/locale";
import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Separator } from "@/components/ui/Separator";
import { CalendarGrid } from "@/components/ui/CalendarGrid";

interface DateRangePickerCustomProps {
  className?: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onRangeChange?: (from: Date | undefined, to: Date | undefined) => void;
  minStartDate?: Date;
  disabled?: boolean;
  placeholder?: string;
}

export function DateRangePickerCustom({
  className,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRangeChange,
  minStartDate,
  disabled = false,
  placeholder = "날짜 범위를 선택하세요",
}: DateRangePickerCustomProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const locale = useLocale();

  const [startMonth, setStartMonth] = React.useState(startDate || new Date());
  const [endMonth, setEndMonth] = React.useState(
    endDate || addDays(new Date(), -30)
  );

  React.useEffect(() => {
    if (isOpen) {
      setStartMonth(startDate || new Date());
      setEndMonth(endDate || startDate || new Date());
    }
  }, [isOpen, startDate, endDate]);

  const handlePreset = (days: number) => {
    const today = startOfDay(new Date());
    let targetStart = addDays(today, -days);

    // minStartDate 제한 적용
    if (minStartDate && targetStart < minStartDate) {
      targetStart = startOfDay(minStartDate);
    }

    // 두 날짜를 한 번에 변경 (React state 배치 문제 해결)
    if (onRangeChange) {
      onRangeChange(targetStart, today);
    } else {
      onStartDateChange(targetStart);
      onEndDateChange(today);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !startDate && !endDate && "text-muted-foreground",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate ? (
              endDate ? (
                `${format(startDate, "y.MM.dd")} - ${format(
                  endDate,
                  "y.MM.dd"
                )}`
              ) : (
                format(startDate, "y.MM.dd")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 flex flex-col lg:flex-row"
          align="start"
        >
          <div className="flex flex-col space-y-2 border-b lg:border-b-0 lg:border-r p-3 pr-4">
            <h4 className="text-sm font-semibold mb-2 text-center">
              기간 설정
            </h4>
            <Button
              onClick={() => handlePreset(7)}
              variant="ghost"
              className="justify-start text-sm h-8"
            >
              지난 7일
            </Button>
            <Button
              onClick={() => handlePreset(30)}
              variant="ghost"
              className="justify-start text-sm h-8"
            >
              지난 30일
            </Button>
            <Button
              onClick={() => handlePreset(90)}
              variant="ghost"
              className="justify-start text-sm h-8"
            >
              지난 3개월
            </Button>
            <Button
              onClick={() => handlePreset(365)}
              variant="ghost"
              className="justify-start text-sm h-8"
            >
              지난 1년
            </Button>
            <Button
              onClick={() => handlePreset(365)}
              variant="ghost"
              className="justify-start text-sm h-8 text-muted-foreground hover:text-foreground"
            >
              기본값으로 초기화
            </Button>
          </div>

          <Separator orientation="horizontal" className="lg:hidden" />
          <Separator orientation="vertical" className="h-auto hidden lg:flex" />

          <div className="flex flex-col lg:flex-row items-center">
            <CalendarGrid
              currentMonth={startMonth}
              setCurrentMonth={setStartMonth}
              selectedDate={startDate}
              onSelectDate={(date) => onStartDateChange(date)}
              minDate={minStartDate}
              maxDate={endDate ? addDays(endDate, -1) : startOfDay(new Date())}
            />

            <div className="px-2 hidden lg:flex">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="py-2 flex lg:hidden">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>

            <CalendarGrid
              currentMonth={endMonth}
              setCurrentMonth={setEndMonth}
              selectedDate={endDate}
              onSelectDate={(date) => onEndDateChange(date)}
              minDate={startDate ? addDays(startDate, 1) : undefined}
              maxDate={startOfDay(new Date())}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
