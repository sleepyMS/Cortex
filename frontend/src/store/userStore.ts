// file: src/store/userStore.ts

import apiClient from "@/lib/apiClient";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// 👈 1. 구독 정보에 대한 상세 타입을 정의합니다.
interface Subscription {
  planId: number;
  status: string;
  planName: "basic" | "trader" | "pro";
  currentPeriodEnd: string;
}

// 👈 2. User 인터페이스의 subscription 타입에 적용합니다.
interface User {
  id: number;
  email: string;
  role: string;
  subscription?: Subscription | null;
}

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

export const useUserStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initialState,
      setTokens: ({ accessToken, refreshToken }) => {
        set({ accessToken, refreshToken });
      },
      setUser: (user) => {
        set({ user });
      },
      logout: () => {
        delete apiClient.defaults.headers.common["Authorization"];
        set({ ...initialState, isAuthInitialized: true });
      },
      setAuthInitialized: (isInitialized) => {
        set({ isAuthInitialized: isInitialized });
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
