// frontend/components/layout/PageWrapper.tsx

import React from "react";

interface PageWrapperProps {
  children: React.ReactNode;
}

/**
 * 메인 콘텐츠 영역을 감싸며 일관된 여백과 최대 너비를 적용하는 컨테이너 컴포넌트입니다.
 * @param {React.ReactNode} children - 이 컴포넌트가 감쌀 자식 요소들입니다.
 */
export function PageWrapper({ children }: PageWrapperProps) {
  return <div className="mx-auto w-full flex-grow">{children}</div>;
}
