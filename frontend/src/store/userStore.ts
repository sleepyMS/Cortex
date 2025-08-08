// file: src/store/userStore.ts

import apiClient from "@/lib/apiClient";
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
  setTokens: (tokens: {
    accessToken: string;
    refreshToken?: string | null;
  }) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setAuthInitialized: (isInitialized: boolean) => void;
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
    (set) => ({
      ...initialState,

      /**
       * 액세스 토큰과 리프레시 토큰을 상태에 저장합니다.
       */
      setTokens: ({ accessToken, refreshToken }) => {
        set({ accessToken, refreshToken });
      },

      /**
       * API로부터 받은 사용자 객체를 상태에 저장합니다.
       */
      setUser: (user) => {
        set({ user });
      },

      /**
       * 사용자를 로그아웃 처리하고 모든 인증 관련 상태를 초기화합니다.
       */
      logout: () => {
        // API 클라이언트의 기본 헤더에서 인증 토큰 제거
        delete apiClient.defaults.headers.common["Authorization"];
        // 상태를 초기화하되, 인증 절차는 완료되었음을 명시
        set({ ...initialState, isAuthInitialized: true });
      },

      /**
       * 초기 인증 시도(useReAuth)가 완료되었음을 표시합니다.
       * 이 값은 UI에서 로딩 상태(스켈레톤 UI)를 제어하는 데 사용됩니다.
       */
      setAuthInitialized: (isInitialized) => {
        set({ isAuthInitialized: isInitialized });
      },
    }),
    {
      name: "cortex-auth-storage", // localStorage에 저장될 키 이름
      storage: createJSONStorage(() => localStorage),
      /**
       * 전체 상태 객체 중 accessToken과 refreshToken만 localStorage에 저장합니다.
       * 사용자 정보(user)는 민감할 수 있고 항상 최신 상태를 유지해야 하므로,
       * 앱 로딩 시 API를 통해 새로 가져오는 것이 안전합니다.
       */
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
