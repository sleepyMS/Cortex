// file: frontend/src/components/ui/Button.tsx

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";

// 버튼의 다양한 시각적 스타일(variants)과 크기(sizes)를 정의합니다.
const buttonVariants = cva(
  // 공통 기본 스타일
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // [Primary] 가장 중요한 CTA 버튼 (바이올렛 테마 적용)
        primary:
          "bg-violet-600 text-primary-foreground hover:bg-violet-600/90 dark:bg-violet-500 dark:hover:bg-violet-500/90",
        // [Secondary] 보조 버튼
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        // [Ghost] 배경 없이 텍스트만 있는 버튼 (테마/언어 전환 등에 사용)
        ghost: "hover:bg-accent hover:text-accent-foreground",
        // [Destructive] 삭제 등 위험한 작업 버튼
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10", // IconButton을 위한 사이즈
      },
    },
    // 기본으로 적용될 값
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={clsx(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
