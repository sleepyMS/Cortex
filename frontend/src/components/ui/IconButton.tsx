// file: frontend/src/components/ui/IconButton.tsx

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/Button"; // 기존 Button 컴포넌트를 import
import { clsx } from "clsx";

// IconButton을 위한 Prop 타입 정의. ButtonProps를 확장합니다.
export interface IconButtonProps extends ButtonProps {}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        // IconButton의 기본 스타일을 variant="ghost"와 size="icon"으로 고정합니다.
        variant="ghost"
        size="icon"
        className={clsx("relative", className)} // 추가적인 클래스를 받을 수 있도록 clsx 사용
        {...props}
      />
    );
  }
);
IconButton.displayName = "IconButton";

export { IconButton };
