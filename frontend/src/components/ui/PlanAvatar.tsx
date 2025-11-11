// file: frontend/src/components/domain/profile/PlanAvatar.tsx

import { cn } from "@/lib/utils";
import { User, Sparkles, ShieldCheck } from "lucide-react";
import { useUserSubscription } from "@/hooks/useUserSubscription";

// --- Prop Interface ---
interface PlanAvatarProps {
  username?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

// --- 2. sizeMap 정의 (오류 7053 해결을 위한 객체 키 정의) ---
const sizeMap = {
  sm: { avatar: "h-12 w-12", icon: "h-3 w-3", initials: "text-xl" },
  md: { avatar: "h-20 w-20", icon: "h-4 w-4", initials: "text-3xl" },
  lg: { avatar: "h-32 w-32", icon: "h-6 w-6", initials: "text-4xl" },
  xl: { avatar: "h-40 w-40", icon: "h-8 w-8", initials: "text-5xl" },
};

export function PlanAvatar({
  username,
  className,
  size = "lg",
}: PlanAvatarProps) {
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

  const currentSizeKey = size as keyof typeof sizeMap;
  const { avatar, icon, initials: initialsClass } = sizeMap[currentSizeKey];

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border-2",
        avatar,
        containerClass,
        className
      )}
    >
      <span className={cn("font-bold text-foreground", initialsClass)}>
        {initials}
      </span>
      <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-1.5">
        <Icon className={cn(icon, iconClass)} />
      </div>
    </div>
  );
}
