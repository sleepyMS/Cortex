// file: frontend/src/components/ui/Card.tsx

import * as React from "react";
import { cn } from "@/lib/utils"; // cn 유틸리티 임포트 (clsx와 tailwind-merge 포함)

// Card: 전체 카드를 감싸는 컨테이너
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    // 👈 Shadcn UI 표준 Card 스타일링으로 변경
    // - border: 기본 테두리
    // - bg-card: --card 변수를 따르는 배경색 (테마에 따라 자동 변경)
    // - text-card-foreground: --card-foreground 변수를 따르는 텍스트 색상
    // - shadow-sm: 기본 그림자
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm", // 👈 변경된 라인
      className // 👈 사용자가 전달하는 className은 마지막에 병합 (우선순위 높음)
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
    className={cn("flex flex-col space-y-1.5 p-6", className)} // 👈 기본 패딩 추가
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
    className={cn("font-semibold leading-none tracking-tight", className)}
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
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// CardContent: 카드의 메인 콘텐츠 영역
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} /> // 👈 기본 패딩 조정 (헤더와 내용 사이)
));
CardContent.displayName = "CardContent";

// CardFooter: 카드의 푸터 영역
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)} // 👈 기본 패딩 조정
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
