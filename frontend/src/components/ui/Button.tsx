// file: frontend/src/components/ui/Button.tsx
// 2025 Premium SaaS Button Component

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";

const buttonVariants = cva(
  // Base styles - enhanced with smooth transitions
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        // [Primary] Main CTA - with gradient and glow effect
        primary:
          "bg-gradient-to-r from-primary to-primary-dark text-primary-foreground shadow-[0_0_20px_rgba(var(--primary-rgb),0.25)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.35)] hover:brightness-105 backdrop-blur-sm",
        // [Secondary] Secondary action
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow",
        // [Outline] Bordered button
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow",
        // [Ghost] Minimal button
        ghost: "hover:bg-accent hover:text-accent-foreground",
        // [Destructive] Danger actions
        destructive:
          "bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 hover:shadow-lg",
        // [Link] Text link style
        link: "text-primary underline-offset-4 hover:underline",
        // [Gradient] Premium CTA with stronger gradient and glow
        gradient:
          "bg-gradient-to-r from-primary via-primary to-primary-dark text-primary-foreground shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_40px_rgba(var(--primary-rgb),0.4)] hover:brightness-110 backdrop-blur-sm",
        // [Glass] Glassmorphism style
        glass:
          "bg-background/50 backdrop-blur-sm border border-border/50 text-foreground hover:bg-background/70 hover:border-border",
        // [Implement] Custom background via className, white text
        implement:
          "text-white shadow-lg hover:brightness-110 active:scale-[0.98] transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-8 text-base",
        xl: "h-12 rounded-xl px-10 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={clsx(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
