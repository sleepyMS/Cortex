import { useRef, useEffect, useMemo } from "react";
import debounce from "lodash.debounce";

/**
 * 안정적인 참조를 가진 debounced callback을 생성합니다.
 * 내부적으로 항상 최신 callback을 참조하므로 의존성 배열 문제가 없습니다.
 *
 * @param callback - debounce할 함수
 * @param delay - 딜레이 (ms)
 * @returns 안정적인 debounced 함수
 *
 * @example
 * const debouncedSearch = useDebouncedCallback((query: string) => {
 *   fetchResults(query);
 * }, 500);
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  // 항상 최신 callback을 ref에 저장
  const callbackRef = useRef(callback);

  // 매 렌더링마다 최신 callback으로 업데이트 (의존성 없음이 의도적)
  useEffect(() => {
    callbackRef.current = callback;
  });

  // delay가 변경될 때만 debounce 함수 재생성
  const debouncedFn = useMemo(
    () =>
      debounce((...args: Parameters<T>) => {
        callbackRef.current(...args);
      }, delay),
    [delay]
  );

  // 언마운트 시 또는 delay 변경 시 cleanup
  useEffect(() => {
    return () => {
      debouncedFn.cancel();
    };
  }, [debouncedFn]);

  return debouncedFn as unknown as T;
}
