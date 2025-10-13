// file: frontend/src/types/user.ts

/**
 * 공개 프로필 페이지 또는 프로필 관리 탭에서 사용될
 * 사용자의 공개 가능한 프로필 정보 타입을 정의합니다.
 * 백엔드의 UserProfileResponse 스키마와 일치합니다.
 */
export type UserProfile = {
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  socialLinks?: {
    twitter?: string | null;
    github?: string | null;
    website?: string | null;
  } | null;
  featuredStrategyId?: string | null;
  featuredPostId?: string | null; // ProfileManagementTab.tsx에 정의되어 있어 추가
};
