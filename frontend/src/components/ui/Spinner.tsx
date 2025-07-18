// file: frontend/src/components/ui/Spinner.tsx (예시 코드)

import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  className = "",
}) => {
  let spinnerSize;
  switch (size) {
    case "sm":
      spinnerSize = "w-4 h-4";
      break;
    case "lg":
      spinnerSize = "w-10 h-10";
      break;
    default: // md
      spinnerSize = "w-6 h-6";
  }

  return (
    <div
      className={`${spinnerSize} border-2 border-primary-foreground border-t-primary rounded-full animate-spin ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
