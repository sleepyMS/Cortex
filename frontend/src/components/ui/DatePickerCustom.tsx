// file: frontend/src/components/ui/DatePickerCustom.tsx

"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { CalendarGrid } from "@/components/ui/CalendarGrid";

interface DatePickerCustomProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  // ... other props
}

export function DatePickerCustom({
  selectedDate,
  onSelectDate,
  ...props
}: DatePickerCustomProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    selectedDate || new Date()
  );

  const handleDateSelect = (date: Date) => {
    onSelectDate(date);
    // Popover를 닫으려면 Popover의 open 상태를 관리해야 합니다. (여기서는 생략)
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full pl-3 text-left font-normal",
            !selectedDate && "text-muted-foreground"
          )}
        >
          {selectedDate ? format(selectedDate, "PPP") : <span>날짜 선택</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarGrid
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          onSelectDate={handleDateSelect}
          // minDate, maxDate props 전달 가능
        />
      </PopoverContent>
    </Popover>
  );
}
