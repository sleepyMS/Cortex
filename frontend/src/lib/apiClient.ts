import axios from "axios";
import { useUserStore } from "@/store/userStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// 요청 인터셉터: 모든 요청에 인증 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    // 👇 2. userStore에서 accessToken을 가져옵니다.
    const accessToken = useUserStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 에러 시 토큰 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // 👇 3. userStore에서 토큰과 액션을 가져옵니다.
      const { refreshToken, setTokens, logout } = useUserStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: new_refreshToken } =
            response.data;

          // 👇 4. userStore의 setTokens 액션으로 새로운 토큰을 저장합니다.
          setTokens({
            accessToken: access_token,
            refreshToken: new_refreshToken,
          });

          // 원래 요청 헤더에 새로운 액세스 토큰을 설정하고 재요청
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error("Refresh token failed:", refreshError);
          logout();
          alert("세션이 만료되었습니다. 다시 로그인해주세요.");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      } else {
        // 리프레시 토큰이 없는 경우
        logout();
        alert("로그인이 필요합니다.");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
