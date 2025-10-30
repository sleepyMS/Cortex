import { PlanSchema } from "@/hooks/usePlans"; // 이미 정의된 타입을 재활용합니다.
import { cache } from "react";

/**
 * 서버 컴포넌트에서 사용할 플랜 데이터 페칭 함수.
 * Next.js의 fetch 캐시와 React의 cache를 사용해 중복 호출을 방지하고,
 * 1시간(3600초) 주기로 데이터를 갱신합니다 (ISR).
 */
export const getPlans = cache(async (): Promise<PlanSchema[]> => {
  try {
    // process.env.NEXT_PUBLIC_API_URL은 lib/apiClient.ts에 정의된 것을 따릅니다.
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans`, {
      method: "GET",
      next: {
        revalidate: 3600, // 1시간 (초 단위)
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch plans: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching plans in Server Component:", error);
    return []; // 페이지가 깨지지 않도록 빈 배열 반환
  }
});
