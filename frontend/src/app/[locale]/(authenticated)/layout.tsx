"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { useIndicatorStore } from "@/store/indicatorStore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Spinner } from "@/components/ui/Spinner";
import { IndicatorMetadata } from "@/types/indicator";

/**
 * 백엔드로부터 '지표 정의서' 원본을 가져오는 API 함수
 */
const fetchIndicatorMetadata = async (): Promise<IndicatorMetadata[]> => {
  const { data } = await apiClient.get("/indicators/metadata");
  return data;
};

/**
 * API 호출 및 전역 상태 업데이트를 책임지는 내부 컴포넌트
 */
function IndicatorMetadataLoader({ children }: { children: React.ReactNode }) {
  const setMetadata = useIndicatorStore((state) => state.setMetadata);

  const { data, isSuccess, isLoading, isError, error } = useQuery({
    queryKey: ["indicatorMetadata"], // 이 key로 데이터가 react-query 전역 캐시에 저장됩니다.
    queryFn: fetchIndicatorMetadata,
    staleTime: Infinity, // 한 번 가져온 데이터는 세션 동안 절대 다시 호출하지 않습니다.
    gcTime: Infinity, // 캐시를 계속 유지합니다.
    retry: 1, // 실패 시 1번만 재시도
  });

  // API 호출이 성공하면, 전역 상태를 최신 '원본' 데이터로 업데이트합니다.
  useEffect(() => {
    if (isSuccess && data) {
      setMetadata(data);
    }
  }, [isSuccess, data, setMetadata]);

  // 로딩 중일 때 보여줄 UI (앱 전체 로딩 스피너 등)
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 에러 발생 시 보여줄 UI
  if (isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-bold text-destructive">Error</h2>
          <p className="text-muted-foreground">
            Failed to load core application data: {error.message}
          </p>
        </div>
      </div>
    );
  }

  // 성공적으로 로드되면 자식 페이지를 렌더링합니다.
  return <>{children}</>;
}

/**
 * 로그인이 필요한 모든 페이지를 감싸는 레이아웃 컴포넌트
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. AuthGuard가 먼저 로그인 여부를 확인합니다.
    //    비로그인 시, 내부 컴포넌트를 렌더링하지 않고 로그인 페이지로 보냅니다.
    <AuthGuard>
      {/* 2. 로그인이 확인된 사용자에게만 IndicatorMetadataLoader를 렌더링합니다. */}
      {/* 이 컴포넌트가 API 호출과 전역 상태 관리를 모두 책임집니다. */}
      <IndicatorMetadataLoader>
        {/* 3. 데이터 로딩까지 성공하면 실제 페이지 내용을 보여줍니다. */}
        {children}
      </IndicatorMetadataLoader>
    </AuthGuard>
  );
}
