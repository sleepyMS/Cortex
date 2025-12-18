// frontend/src/components/ui/Skeleton.tsx
// 2025 Premium SaaS Skeleton Component

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use shimmer animation instead of pulse */
  shimmer?: boolean;
}

function Skeleton({ className, shimmer = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted",
        shimmer
          ? "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent"
          : "animate-pulse",
        className
      )}
      {...props}
    />
  );
}

// Skeleton variants for common use cases
function SkeletonText({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-4 w-full", className)} {...props} />;
}

function SkeletonTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-6 w-3/4", className)} {...props} />;
}

function SkeletonAvatar({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton className={cn("h-10 w-10 rounded-full", className)} {...props} />
  );
}

function SkeletonCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export { Skeleton, SkeletonText, SkeletonTitle, SkeletonAvatar, SkeletonCard };
