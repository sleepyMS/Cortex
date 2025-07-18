// file: frontend/src/lib/apiClient.ts

import axios from "axios";
import useAuthStore from "@/store/authStore";

// 환경 변수에서 백엔드 API URL 가져오기
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: API_URL, // 백엔드 API 기본 URL
  headers: {
    "Content-Type": "application/json", // 기본 Content-Type 설정
  },
});

// 요청 인터셉터: 모든 요청에 인증 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    // Zustand 스토어에서 accessToken 가져오기
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리 및 토큰 갱신 로직
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest.url;

    const isAuthEndpoint =
      requestUrl === "/auth/login" || requestUrl === "/auth/signup";

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      const { refreshToken, logout, login } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          const {
            access_token: new_accessToken,
            refresh_token: new_refreshToken,
          } = response.data;

          const currentUserInfo = useAuthStore.getState().userInfo;
          login(currentUserInfo!, new_accessToken, new_refreshToken);

          originalRequest.headers.Authorization = `Bearer ${new_accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError: any) {
          console.error("Refresh token failed:", refreshError);
          logout();
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          window.location.href = "/login"; // window.location.href로 리디렉션 (새로고침 포함)
          return Promise.reject(refreshError);
        }
      } else {
        logout();
        alert("로그인이 필요합니다.");
        window.location.href = "/login"; // window.location.href로 리디렉션 (새로고침 포함)
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
