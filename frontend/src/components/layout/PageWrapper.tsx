// frontend/src/components/layout/PageWrapper.tsx

import React from "react";
import clsx from "clsx"; // clsx 유틸리티 임포트

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string; // 추가적인 스타일을 받을 수 있도록
}

/**
 * 메인 콘텐츠 영역을 감싸며 일관된 여백과 최대 너비를 적용하는 컨테이너 컴포넌트입니다.
 * @param {React.ReactNode} children - 이 컴포넌트가 감쌀 자식 요소들입니다.
 * @param {string} [className] - 추가적으로 적용될 Tailwind CSS 클래스입니다.
 */
export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div
      className={clsx(
        "container mx-auto max-w-5xl px-4 flex-grow", // ✨ 변경된 부분: container, max-w-5xl, px-4, py-8 추가
        className
      )}
    >
      {children}
    </div>
  );
}
