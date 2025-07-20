// // file: src/store/authStore.ts

// import { create, StateCreator } from "zustand";
// import { persist, createJSONStorage, PersistOptions } from "zustand/middleware";
// import React from "react";

// // 사용자 정보 타입 정의
// export interface UserInfo {
//   id: number;
//   email: string;
//   role: string;
//   // TODO: 필요에 따라 다른 사용자 정보 필드 추가 (예: subscription)
// }

// // 스토어 상태 타입 정의
// export interface AuthState {
//   isLoggedIn: boolean;
//   userInfo: UserInfo | null;
//   accessToken: string | null;
//   refreshToken: string | null;
//   _hasHydrated: boolean; // persist 미들웨어의 상태 복원 완료 여부 플래그

//   login: (
//     userInfo: UserInfo,
//     accessToken: string,
//     refreshToken: string | null
//   ) => void;
//   logout: () => void;
//   setHasHydrated: (state: boolean) => void; // _hasHydrated 설정 함수
// }

// // -----------------------------------------------------------
// // Zustand 스토어 정의
// // -----------------------------------------------------------

// const authStoreInitializer: StateCreator<
//   AuthState,
//   [["zustand/persist", unknown]]
// > = (set) => ({
//   isLoggedIn: false,
//   userInfo: null,
//   accessToken: null,
//   refreshToken: null,
//   _hasHydrated: false, // 초기값 false

//   login: (userInfo, accessToken, refreshToken) => {
//     set({ isLoggedIn: true, userInfo, accessToken, refreshToken });
//   },
//   logout: () => {
//     set({
//       isLoggedIn: false,
//       userInfo: null,
//       accessToken: null,
//       refreshToken: null,
//     });
//     localStorage.removeItem("accessToken");
//     localStorage.removeItem("refreshToken");
//   },
//   setHasHydrated: (state: boolean) => {
//     set({ _hasHydrated: state });
//   },
// });

// // PersistOptions 타입 명시
// type AuthPersistOptions = PersistOptions<
//   AuthState,
//   Pick<AuthState, "accessToken" | "refreshToken">
// >;

// const useAuthStore = create<AuthState>()(
//   persist(
//     authStoreInitializer, // StateCreator를 직접 전달
//     {
//       name: "auth-storage",
//       storage: createJSONStorage(() => localStorage),

//       // partialize 함수: 저장할 상태의 부분 집합을 반환
//       partialize: (
//         state: AuthState
//       ): Pick<AuthState, "accessToken" | "refreshToken"> => ({
//         accessToken: state.accessToken,
//         refreshToken: state.refreshToken,
//       }),

//       // onRehydrateStorage 콜백: persist 미들웨어가 데이터를 로컬 스토리지에서 읽은 직후 호출
//       onRehydrateStorage: (state: AuthState | undefined) => {
//         // state는 로드된 상태 (아직 적용 전)
//         console.log("DEBUG(authStore): onRehydrateStorage triggered.");

//         // 이 함수가 반환하는 콜백은 persist 미들웨어의 내부 로직에 의해 호출됩니다.
//         // 이 콜백의 시그니처가 TypeScript 오류의 원인이었습니다.
//         // `(actualState?: AuthState, error?: unknown) => void` 시그니처를 따릅니다.
//         return (actualState?: AuthState, error?: unknown) => {
//           if (error) {
//             console.error("ERROR(authStore): Hydration failed:", error);
//             // hydration 실패 시 _hasHydrated를 true로 설정하고 로그아웃 처리
//             useAuthStore.getState().setHasHydrated(true);
//             useAuthStore.getState().logout();
//             return;
//           }

//           // actualState는 로컬 스토리지에서 성공적으로 복원된 상태입니다.
//           // 이 시점에서 _hasHydrated를 true로 설정합니다.
//           if (actualState) {
//             // actualState가 undefined가 아닐 때
//             actualState.setHasHydrated(true);
//             console.log(
//               "DEBUG(authStore): Hydration complete via onRehydrateStorage return function."
//             );

//             if (actualState.accessToken) {
//               console.log(
//                 "DEBUG(authStore): Hydration complete with persisted token."
//               );
//             } else {
//               console.log(
//                 "DEBUG(authStore): Hydration complete, but no persisted token found."
//               );
//             }
//           } else {
//             // actualState가 undefined인 경우 (저장된 상태가 없거나 문제 발생)
//             useAuthStore.getState().setHasHydrated(true); // Hydration 완료로 처리
//             useAuthStore.getState().logout(); // 로그인 상태가 없으므로 로그아웃 처리
//             console.log(
//               "DEBUG(authStore): Hydration complete, but no actual state provided. Logging out."
//             );
//           }
//         };
//       },
//     }
//   )
// );

// export default useAuthStore;
