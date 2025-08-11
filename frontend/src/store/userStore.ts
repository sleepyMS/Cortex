// file: src/store/userStore.ts

import apiClient from "@/lib/apiClient";
import axios from "axios";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// --- 타입 정의: 백엔드 `schemas.py`와 일치 ---

/**
 * 백엔드 `PlanFeatureSchema`에 해당하는 타입.
 * 각 플랜이 제공하는 상세 기능 제한을 정의합니다.
 */
interface PlanFeature {
  maxStrategies: number;
  maxCoinsPerBacktest: number;
  liveBotsLimit: number;
  dailyBacktestCount: number;
  maxBacktestDurationYears: number | null;
  supportedTimeframes: string;
  communityAccess: boolean;
  telegramAlerts: boolean;
  advancedFeaturesAccess: boolean;
  portfolioBacktestAccess: boolean;
}

/**
 * 백엔드 `PlanSchema`에 해당하는 타입.
 */
interface Plan {
  id: number;
  name: string;
  price: number;
  features: PlanFeature;
}

/**
 * 백엔드 `SubscriptionSchema`에 해당하는 타입.
 */
interface Subscription {
  id: number;
  planId: number;
  status: string;
  currentPeriodEnd: string | null;
  plan: Plan;
}

/**
 * 백엔드 `User` 모델에 해당하는 타입.
 * 사용자의 모든 정보를 포함하며, 상세 구독 정보를 포함할 수 있습니다.
 */
interface User {
  id: number;
  email: string;
  username: string | null;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  subscription: Subscription | null;
}

// --- Zustand 스토어 상태 및 액션 타입 ---
interface State {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthInitialized: boolean;
}

interface Actions {
  loginAndUpdateUser: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => Promise<void>;
  rehydrateAndSetUser: () => Promise<void>;
  logout: () => void;
  // 토큰 갱신을 전담하는 새로운 중앙 액션
  refreshSession: () => Promise<string | null>;
}

const initialState: State = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthInitialized: false,
};

// --- Zustand 스토어 생성 ---
export const useUserStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 로그인 성공 후 호출되는 중앙 액션
      loginAndUpdateUser: async (tokens) => {
        const { accessToken, refreshToken } = tokens;
        set({ accessToken, refreshToken });
        apiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${accessToken}`;

        try {
          const response = await apiClient.get("/users/me");
          set({ user: response.data, isAuthInitialized: true });
        } catch (error) {
          console.error("로그인 후 사용자 정보 가져오기 실패:", error);
          get().logout();
        }
      },

      // 페이지 로드/새로고침 시 호출되는 재인증 액션
      rehydrateAndSetUser: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ isAuthInitialized: true });
          return;
        }
        apiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${accessToken}`;

        try {
          const response = await apiClient.get("/users/me");
          set({ user: response.data, isAuthInitialized: true });
        } catch (error) {
          console.error("재인증 실패:", error);
          get().logout();
        }
      },

      // 사용자를 로그아웃 처리하는 액션
      logout: () => {
        delete apiClient.defaults.headers.common["Authorization"];
        set({ ...initialState, isAuthInitialized: true });
      },

      /**
       * 토큰 갱신(Refresh) 로직 전체를 책임지는 중앙 액션입니다.
       * apiClient의 401 인터셉터에서 호출됩니다.
       */
      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return null;
        }

        try {
          // 토큰 갱신은 순환 참조를 피하기 위해 apiClient 대신 axios를 직접 사용합니다.
          const response = await axios.post(
            `${
              process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"
            }/auth/refresh`,
            { refreshToken }
          );

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data;

          set({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          // apiClient의 기본 헤더도 새로운 토큰으로 업데이트합니다.
          apiClient.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newAccessToken}`;

          // 성공 시, 재요청에 사용할 새로운 액세스 토큰을 반환합니다.
          return newAccessToken;
        } catch (error) {
          console.error("Refresh token failed, logging out:", error);
          get().logout();
          return null;
        }
      },
    }),
    {
      name: "cortex-auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
