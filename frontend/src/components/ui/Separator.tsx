// frontend/src/components/ui/Separator.tsx

"use client";

import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator"; // Radix UI Separator 임포트

import { cn } from "@/lib/utils"; // cn 유틸리티 임포트

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border", // 기본 배경색 (Tailwind CSS)
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", // 수평/수직 방향
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator };
