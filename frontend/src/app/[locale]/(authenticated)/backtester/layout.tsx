// file: frontend/src/app/[locale]/(authenticated)/backtester/layout.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BacktestSidebar } from "@/components/domain/backtesting/BacktestSidebar";
import { cn } from "@/lib/utils";

interface BacktesterLayoutProps {
  children: React.ReactNode;
}

export default function BacktesterLayout({ children }: BacktesterLayoutProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Determine if we're on a detail page (not /new and has backtestId)
  const isDetailView = React.useMemo(() => {
    // Match /backtester/{id} but not /backtester/new
    const match = pathname.match(/\/backtester\/([^/]+)$/);
    if (!match) return false;
    return match[1] !== "new";
  }, [pathname]);

  // List view - no sidebar, just render children
  if (!isDetailView) {
    return <>{children}</>;
  }

  // Detail view - sidebar + content
  return (
    <div className="flex min-h-screen">
      <BacktestSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main
        className={cn(
          "flex-1 overflow-auto transition-all duration-200",
          sidebarCollapsed ? "md:ml-0" : "md:ml-0"
        )}
      >
        {children}
      </main>
    </div>
  );
}
