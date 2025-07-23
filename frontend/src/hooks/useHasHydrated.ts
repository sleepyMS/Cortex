import { useState, useEffect } from "react";

/**
 * 컴포넌트가 클라이언트에서 성공적으로 마운트되었는지 여부를 반환하는 훅.
 * 서버 사이드 렌더링(SSR)과 클라이언트 사이드 상태 복원(hydration) 간의
 * 불일치를 해결하는 데 사용됩니다.
 */
export function useHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // useEffect는 클라이언트에서 컴포넌트가 마운트된 후에만 실행되므로,
    // 이 시점에서 hasHydrated를 true로 설정하면 마운트가 완료되었음을 보장할 수 있습니다.
    setHasHydrated(true);
  }, []);

  return hasHydrated;
}
