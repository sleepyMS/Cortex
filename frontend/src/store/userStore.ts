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
  paymentGatewayCustomerKey?: string;
  nextPlanId?: string;
  nextPlan?: Plan;
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
  setTokens: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => void;
  loginAndUpdateUser: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => Promise<void>;
  rehydrateAndSetUser: () => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<string | null>;
  setCreditBalance: (balance: CreditBalanceSummary) => void;
  syncCreditBalance: () => Promise<void>;
  updateSubscription: (subscription: Subscription) => void; // [추가]
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

      setTokens: (tokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      },

      // 로그인 성공 후 호출되는 중앙 액션
      loginAndUpdateUser: async (tokens) => {
        // 먼저 토큰부터 설정
        get().setTokens(tokens);

        try {
          // 그 다음 사용자 정보 가져오기
          const response = await apiClient.get<User>("/users/me");
          set({
            user: response.data,
            creditBalance: response.data.creditBalance,
            isAuthInitialized: true,
          });
        } catch (error) {
          console.error("로그인 후 사용자 정보 가져오기 실패:", error);
          get().logout();
        }
      },

      // 페이지 로드/새로고침 시 호출되는 재인증 액션
      rehydrateAndSetUser: async () => {
        // --- 👇 [핵심 수정] 기존 코드의 방어 로직을 복원합니다. ---
        const { accessToken } = get();
        if (!accessToken) {
          // 토큰이 없으면 인증 시도를 할 필요가 없으므로,
          // '인증 초기화 완료' 상태만 true로 바꾸고 즉시 종료합니다.
          set({ isAuthInitialized: true });
          return;
        }
        // --- 👆 [핵심 수정] ---

        try {
          // 토큰이 존재할 경우에만 API를 호출합니다.
          const response = await apiClient.get<User>("/users/me");
          set({
            user: response.data,
            creditBalance: response.data.creditBalance,
            isAuthInitialized: true,
          });
        } catch (error) {
          // API 호출 실패 시, apiClient 인터셉터가 로그아웃을 처리할 것이므로,
          // 여기서는 앱이 크래시되지 않도록 에러를 잡아주고
          // '인증 초기화 완료' 상태만 true로 설정합니다.
          set({ isAuthInitialized: true });
          console.error("재인증 과정에서 최종 에러가 발생했습니다:", error);
        }
      },

      // 사용자를 로그아웃 처리하는 액션
      logout: () => {
        // [수정] 잠재적인 혼란을 방지하기 위해 루트 레벨의 토큰 키도 삭제합니다.
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
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

        // [추가] Race Condition 방지: LocalStorage의 최신 상태를 확인합니다.
        // 다른 탭이나 프로세스에서 이미 토큰을 갱신했을 수 있습니다.
        try {
          const storageStr = localStorage.getItem("cortex-auth-storage");
          if (storageStr) {
            const storageData = JSON.parse(storageStr);
            const storedRefreshToken = storageData?.state?.refreshToken;

            // 저장된 리프레시 토큰이 현재 메모리의 토큰과 다르고, 유효한 값이 존재한다면
            // 이미 갱신된 것으로 간주하고 저장된 값을 사용합니다.
            if (
              storedRefreshToken &&
              storedRefreshToken !== refreshToken &&
              storedRefreshToken !== "null"
            ) {
              console.log(
                "Detected token refresh by another tab/process. Syncing..."
              );
              const storedAccessToken = storageData?.state?.accessToken;
              if (storedAccessToken) {
                set({
                  accessToken: storedAccessToken,
                  refreshToken: storedRefreshToken,
                });
                return storedAccessToken;
              }
            }
          }
        } catch (e) {
          console.warn("Error checking localStorage for race condition:", e);
          // 파싱 에러 등 발생 시 무시하고 정상 흐름 진행
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

          get().setTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

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
        }
      },

      // [추가] subscription만 업데이트하는 액션
      updateSubscription: (subscription) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                subscription,
              }
            : null,
        }));
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
