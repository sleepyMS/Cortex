// file: frontend/src/components/ui/Input.tsx
// 2025 Premium SaaS Input Component

import * as React from "react";
import { clsx } from "clsx";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={clsx(
          // Base styles
          "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm",
          // Placeholder & file input
          "placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Transition
          "transition-all duration-200",
          // Focus state with ring and border color change
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary",
          // Hover state
          "hover:border-muted-foreground/30",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
          // Ring offset
          "ring-offset-background",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
