import apiClient from "@/lib/apiClient";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  id: number;
  email: string;
  role: string;
  subscription?: any;
}

interface State {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface Actions {
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const initialState: State = {
  user: null,
  accessToken: null,
  refreshToken: null,
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
        set(initialState);
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
