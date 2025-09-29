// file: src/store/userStore.ts

import apiClient from "@/lib/apiClient";
import axios from "axios";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// --- 타입 정의: 백엔드 `schemas.py`와 일치 ---

// [크레딧 시스템] CreditBalanceBreakdownEvent 스키마 타입
interface CreditBalanceBreakdownEvent {
  amount: number;
  expiresAt: string; // ISO 8601 날짜 문자열
}

// [크레딧 시스템] CreditBalanceBreakdown 스키마 타입
interface CreditBalanceBreakdown {
  purchased: number;
  expiringWeekly: number;
  event: CreditBalanceBreakdownEvent[];
}

// [크레딧 시스템] CreditBalanceSummary 스키마 타입
export interface CreditBalanceSummary {
  totalBalance: number;
  cashCreditBalance: number;
  breakdown: CreditBalanceBreakdown;
}

/**
 * 백엔드 `PlanFeatureSchema`에 해당하는 타입.
 */
interface PlanFeature {
  maxStrategies: number;
  maxCoinsPerBacktest: number;
  liveBotsLimit: number;
  dailyBacktestCount: number; // 이 속성은 크레딧 시스템 도입으로 사용되지 않을 수 있음
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
  id: string; // UUID는 string 타입으로 처리
  name: string;
  price: number;
  features: PlanFeature;
}

/**
 * 백엔드 `SubscriptionSchema`에 해당하는 타입.
 */
interface Subscription {
  id: string; // UUID
  planId: string; // UUID
  status: string;
  currentPeriodEnd: string | null;
  plan: Plan;
}

/**
 * 백엔드 `User` 모델에 해당하는 타입.
 * [수정] creditBalance 속성을 포함하도록 확장되었습니다.
 */
interface User {
  id: string; // UUID
  email: string;
  username: string | null;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  subscription: Subscription | null;
  creditBalance: CreditBalanceSummary | null; // 크레딧 정보 추가
}

// --- Zustand 스토어 상태 및 액션 타입 ---
interface State {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthInitialized: boolean;
  creditBalance: CreditBalanceSummary | null; // 크레딧 상태 추가
}

interface Actions {
  loginAndUpdateUser: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => Promise<void>;
  rehydrateAndSetUser: () => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<string | null>;
  setCreditBalance: (balance: CreditBalanceSummary) => void; // 크레딧 갱신 액션 추가
  syncCreditBalance: () => Promise<void>; // [추가] 새 액션 타입 정의
}

const initialState: State = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthInitialized: false,
  creditBalance: null, // 초기 상태에 크레딧 추가
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
          // 백엔드 /users/me 응답에 user와 creditBalance가 모두 포함되어 있다고 가정
          const response = await apiClient.get<User>("/users/me");
          set({
            user: response.data,
            creditBalance: response.data.creditBalance, // 응답에서 크레딧 정보 추출
            isAuthInitialized: true,
          });
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
          const response = await apiClient.get<User>("/users/me");
          set({
            user: response.data,
            creditBalance: response.data.creditBalance, // 응답에서 크레딧 정보 추출
            isAuthInitialized: true,
          });
        } catch (error) {
          console.error("재인증 실패:", error);
          // 401 에러의 경우 apiClient 인터셉터에서 refreshSession을 호출하므로,
          // 여기서는 일반적인 로그아웃 처리만 수행
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
       */
      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return null;
        }

        try {
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

          apiClient.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newAccessToken}`;

          return newAccessToken;
        } catch (error) {
          console.error("Refresh token failed, logging out:", error);
          get().logout();
          return null;
        }
      },

      // 크레딧 잔액만 단독으로 갱신하는 새 액션
      setCreditBalance: (balance) => {
        set({ creditBalance: balance });
      },

      syncCreditBalance: async () => {
        try {
          const response = await apiClient.get<CreditBalanceSummary>(
            "/users/me/credit-balance"
          );
          set({ creditBalance: response.data });
        } catch (error) {
          console.error("Failed to sync credit balance:", error);
          // 에러 발생 시 크레딧 정보를 null로 처리하여 오래된 정보가 표시되지 않도록 할 수 있습니다.
          // set({ creditBalance: null });
        }
      },
    }),
    {
      name: "cortex-auth-storage", // 로컬 스토리지에 저장될 키 이름
      storage: createJSONStorage(() => localStorage),
      // accessToken과 refreshToken만 로컬 스토리지에 저장하고,
      // user 객체나 creditBalance는 저장하지 않아 항상 최신 정보를 서버에서 가져오도록 합니다.
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
