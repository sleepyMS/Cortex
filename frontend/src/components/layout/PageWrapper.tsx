// frontend/components/layout/PageWrapper.tsx

import React from "react";
import clsx from "clsx";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string; // 추가적인 스타일을 받을 수 있도록
}

/**
 * 메인 콘텐츠 영역을 감싸는 컨테이너 컴포넌트입니다.
 * 이 컴포넌트 자체는 수평적인 제약 (max-width, px)을 두지 않습니다.
 * 수평적인 제약은 각 페이지나 섹션 내부에서 직접 관리됩니다.
 * @param {React.ReactNode} children - 이 컴포넌트가 감쌀 자식 요소들입니다.
 * @param {string} [className] - 추가적으로 적용될 Tailwind CSS 클래스입니다.
 */
export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div
      className={clsx(
        "w-full flex-grow", // 변경됨: container, mx-auto, max-w-5xl, px-4 제거
        className
      )}
    >
      {children}
    </div>
  );
}
