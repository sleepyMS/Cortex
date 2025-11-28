// file: frontend/src/components/ui/Tooltip.tsx

"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

// 1. TooltipProvider: 툴팁의 활성화 영역과 delay를 관리합니다.
// 앱의 최상단(e.g., layout.tsx)에 한 번만 감싸주면 앱 전체에서 툴팁을 사용할 수 있습니다.
const TooltipProvider = TooltipPrimitive.Provider;

// 2. Tooltip: 툴팁의 Trigger와 Content를 감싸는 메인 컨테이너입니다.
const Tooltip = TooltipPrimitive.Root;

// 3. TooltipTrigger: 툴팁을 활성화시키는 요소(자식 요소)를 감싸는 컴포넌트입니다.
const TooltipTrigger = TooltipPrimitive.Trigger;

// 4. TooltipContent: 실제 툴팁 내용을 담는 컴포넌트입니다.
// globals.css의 디자인 토큰을 사용하여 스타일을 정의합니다.
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        // 기본 스타일: 팝오버 배경색, 텍스트 색상, 그림자, 패딩, 폰트 스타일 등
        // globals.css의 --popover, --popover-foreground 변수를 사용합니다.
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        // 애니메이션: 나타나고 사라질 때 부드러운 효과를 줍니다.
        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        // 위치에 따른 애니메이션 방향 (side prop에 따라 적용됨)
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// 5. 내보내기: 다른 컴포넌트에서 import하여 사용할 수 있도록 합니다.
export { Tooltip, TooltipTrigger, TooltipProvider, TooltipContent };
