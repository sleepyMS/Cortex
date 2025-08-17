// file: frontend/src/hooks/useHasHydrated.ts

import { useState, useEffect } from "react";

/**
 * 컴포넌트가 클라이언트 측에서 성공적으로 Hydration(마운트)되었는지 여부를 확인하는 훅입니다.
 *
 * 서버에서 렌더링된 초기 UI와 클라이언트에서 렌더링된 초기 UI가 불일치하여 발생하는
 * Next.js의 Hydration 오류를 방지하는 데 사용됩니다.
 *
 * @returns {boolean} - 컴포넌트가 클라이언트에서 마운트되었으면 `true`, 아니면 `false`를 반환합니다.
 */
export const useHasHydrated = (): boolean => {
  // 1. 초기 상태는 항상 `false`입니다. 서버 렌더링 시점과 클라이언트의 첫 렌더링 시점 모두 `false`를 반환합니다.
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    // 2. useEffect는 오직 클라이언트에서, 컴포넌트가 DOM에 마운트된 후에만 실행됩니다.
    // 따라서 이 Effect가 실행되는 시점은 Hydration이 완료되었음을 의미합니다.
    // 이 때 상태를 `true`로 변경하여 리렌더링을 유발합니다.
    setHasHydrated(true);
  }, []); // 의존성 배열이 비어있으므로, 컴포넌트가 처음 마운트될 때 단 한 번만 실행됩니다.

  return hasHydrated;
};
