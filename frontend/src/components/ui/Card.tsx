// file: frontend/src/components/ui/Card.tsx

import * as React from "react";
import { clsx } from "clsx";

// Card: 전체 카드를 감싸는 컨테이너. Glassmorphism 스타일 적용
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx(
      // Glassmorphism 효과와 디자인
      "rounded-xl border border-white/20 bg-white/10 p-6 shadow-lg backdrop-blur-lg",
      // 다크 모드 스타일
      "dark:border-black/20 dark:bg-black/10",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

// CardHeader: 카드의 헤더 영역
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// CardTitle: 카드의 제목. <h3> 태그로 렌더링
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={clsx(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// CardDescription: 카드의 부가 설명
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={clsx("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// CardContent: 카드의 메인 콘텐츠 영역
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={clsx("pt-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

// CardFooter: 카드의 푸터 영역
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx("flex items-center pt-4", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
