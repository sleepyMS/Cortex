// file: frontend/src/app/[locale]/profile/[username]/page.tsx

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserProfileDisplay } from "@/components/domain/profile/UserProfileDisplay";
import { FeaturedStrategyCard } from "@/components/domain/profile/FeaturedStrategyCard";
import apiClient from "@/lib/apiClient"; // 서버에서도 사용 가능하도록 설정 필요
import type { UserProfile } from "@/types/user"; // 타입 정의 필요
import type { StrategyInList } from "@/types/strategy";

// 서버에서 데이터를 미리 가져오는 함수
async function getUserProfile(username: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/${username}/profile`,
      {
        next: {
          revalidate: 86400, // 1일짜리 안전망 캐시
          tags: [`profile-${username}`],
        },
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    return null;
  }
}

async function getFeaturedStrategy(
  strategyId: string
): Promise<StrategyInList | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/strategies/${strategyId}/summary`,
      {
        next: {
          revalidate: 86400, // 1일짜리 안전망 캐시
          tags: [`strategy-summary-${strategyId}`],
        },
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Failed to fetch featured strategy summary:", error);
    return null;
  }
}

// 페이지 컴포넌트 (서버 컴포넌트)
export default async function ProfilePage({
  params: { username },
}: {
  params: { username: string };
}) {
  const t = await getTranslations("PublicProfile");
  const profileData: UserProfile | null = await getUserProfile(username);

  if (!profileData) {
    notFound(); // 사용자를 찾지 못하면 404 페이지 표시
  }

  let featuredStrategy: StrategyInList | null = null;
  if (profileData.featuredStrategyId) {
    featuredStrategy = await getFeaturedStrategy(
      profileData.featuredStrategyId
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 space-y-8">
      {/* 1. 사용자 프로필 정보 표시 컴포넌트 */}
      <UserProfileDisplay profile={profileData} />

      {/* 2. 대표 전략 표시 컴포넌트 */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          {t("featuredStrategyTitle")}
        </h2>
        {featuredStrategy ? (
          <FeaturedStrategyCard strategy={featuredStrategy} />
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">{t("noFeaturedContent")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
