"use client";

import React from "react";
import { cn } from "@/lib/utils";

// 컴포넌트가 받을 props의 타입을 정의합니다.
interface DashboardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
}

export function DashboardHeader({
  title,
  description,
  className,
  ...props
}: DashboardHeaderProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-lg text-muted-foreground">{description}</p>
    </div>
  );
}
