// frontend/src/components/ui/Textarea.tsx
// 2025 Premium SaaS Textarea Component

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
          // Placeholder
          "placeholder:text-muted-foreground",
          // Transition
          "transition-all duration-200",
          // Focus state
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary",
          // Hover state
          "hover:border-muted-foreground/30",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
          // Ring offset
          "ring-offset-background",
          // Resize handle
          "resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
