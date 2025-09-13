"use client";

import { cn } from "@/lib/utils";
import { User, Sparkles, ShieldCheck } from "lucide-react";
import { useUserSubscription } from "@/hooks/useUserSubscription";

interface PlanAvatarProps {
  username?: string | null;
  className?: string;
}

export function PlanAvatar({ username, className }: PlanAvatarProps) {
  const { isPro, isTrader } = useUserSubscription();

  const planConfig = {
    pro: {
      Icon: ShieldCheck,
      containerClass:
        "border-primary/50 bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]",
      iconClass: "text-primary",
    },
    trader: {
      Icon: Sparkles,
      containerClass:
        "border-yellow-400/30 bg-yellow-400/10 shadow-[0_0_15px_rgba(255,215,0,0.2)]",
      iconClass: "text-yellow-400",
    },
    basic: {
      Icon: User,
      containerClass: "border-border bg-muted",
      iconClass: "text-muted-foreground",
    },
  };

  const currentPlan = isPro ? "pro" : isTrader ? "trader" : "basic";
  const { Icon, containerClass, iconClass } = planConfig[currentPlan];

  const initials = username?.slice(0, 2).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-2",
        containerClass,
        className
      )}
    >
      <span className="text-4xl font-bold text-foreground">{initials}</span>
      <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1.5">
        <Icon className={cn("h-6 w-6", iconClass)} />
      </div>
    </div>
  );
}
