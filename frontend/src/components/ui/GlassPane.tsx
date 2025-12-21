import { cn } from "@/lib/utils";

interface GlassPaneProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassPane({ children, className, ...props }: GlassPaneProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/5 bg-background/40 backdrop-blur-xl",
        "shadow-2xl shadow-black/40",
        className
      )}
      {...props}
    >
      {/* Optional: Add a subtle inner glow or noise texture if needed for more premium feel */}
      <div className="absolute inset-0 z-[-1] bg-gradient-to-tr from-white/5 to-transparent opacity-20 pointer-events-none" />

      {children}
    </div>
  );
}
