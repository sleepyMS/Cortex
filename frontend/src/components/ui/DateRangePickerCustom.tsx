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
}

export function DateRangePickerCustom({
  className,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
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
    onStartDateChange(addDays(today, -days));
    onEndDateChange(today);
    setIsOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !startDate && !endDate && "text-muted-foreground"
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
              <span>날짜 범위를 선택하세요</span>
            )}
          </Button>
        </PopoverTrigger>
        {/* ▼▼▼ [핵심 수정] flex-col lg:flex-row 적용 ▼▼▼ */}
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
              onClick={() => {
                onStartDateChange(undefined);
                onEndDateChange(undefined);
                setIsOpen(false);
              }}
              variant="ghost"
              className="justify-start text-sm h-8 text-destructive hover:text-destructive"
            >
              초기화
            </Button>
          </div>

          {/* ▼▼▼ [핵심 수정] 반응형 구분선 ▼▼▼ */}
          <Separator orientation="horizontal" className="lg:hidden" />
          <Separator orientation="vertical" className="h-auto hidden lg:flex" />

          {/* ▼▼▼ [핵심 수정] flex-col lg:flex-row 적용 ▼▼▼ */}
          <div className="flex flex-col lg:flex-row items-center">
            <CalendarGrid
              currentMonth={startMonth}
              setCurrentMonth={setStartMonth}
              selectedDate={startDate}
              onSelectDate={(date) => onStartDateChange(date)}
              maxDate={endDate ? addDays(endDate, -1) : undefined}
            />

            <div className="px-2 hidden lg:flex">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            {/* ▼▼▼ [핵심 추가] 모바일용 세로 화살표 아이콘 ▼▼▼ */}
            <div className="py-2 flex lg:hidden">
              <ArrowDown className="h-5 w-5 text-muted-foreground" />
            </div>

            <CalendarGrid
              currentMonth={endMonth}
              setCurrentMonth={setEndMonth}
              selectedDate={endDate}
              onSelectDate={(date) => onEndDateChange(date)}
              minDate={startDate ? addDays(startDate, 1) : undefined}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
