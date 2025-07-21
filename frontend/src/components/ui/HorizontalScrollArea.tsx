"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { clsx } from "clsx";

const HorizontalScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={clsx("relative w-full overflow-hidden", className)}
    {...props}
    type="auto" // 가로 스크롤을 위해 type을 auto로 설정
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    {/* 가로 스크롤바는 시각적으로 숨깁니다. */}
    <ScrollAreaPrimitive.Scrollbar
      orientation="horizontal"
      className="invisible h-0"
    />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
HorizontalScrollArea.displayName = "HorizontalScrollArea";

export { HorizontalScrollArea };
