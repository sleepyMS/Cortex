// file: frontend/src/app/[locale]/auth/callback/page.tsx

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // URL에서 'token'이라는 이름의 파라미터를 찾습니다.
    const token = searchParams.get("token");

    if (token) {
      // 1. 토큰을 localStorage에 저장합니다. (가장 일반적인 방법)
      localStorage.setItem("accessToken", token);

      // 2. 토큰 저장 후, 사용자를 대시보드 페이지로 보냅니다.
      //    push 대신 replace를 사용하여 브라우저 히스토리에 남기지 않습니다.
      router.replace("/dashboard");
    } else {
      // 토큰이 없는 경우, 에러 메시지를 보여주고 로그인 페이지로 보냅니다.
      alert("로그인에 실패했습니다. 다시 시도해주세요.");
      router.replace("/login");
    }

    // 이 컴포넌트는 토큰 처리만 하고 바로 이동하므로, 의존성 배열이 비어있습니다.
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <p>로그인 중입니다...</p>
        <p>잠시만 기다려주세요.</p>
      </div>
    </div>
  );
}
