import axios, { AxiosError } from "axios";
import { useUserStore } from "@/store/userStore";
import { toast } from "sonner"; // 👈 alert 대신 toast를 사용하기 위해 임포트

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// 요청 인터셉터: 모든 요청에 인증 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = useUserStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 👈 토큰 갱신 중복 실행을 방지하기 위한 변수
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 응답 인터셉터: 401 에러 시 토큰 갱신
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // 토큰 갱신이 이미 진행 중인 경우, 현재 요청을 큐에 추가하고 대기
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useUserStore.getState();

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken: refreshToken, // 👈 핵심 버그 수정: snake_case -> camelCase
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data;

          setTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          // 새로 받은 토큰으로 원래 요청 헤더를 설정
          apiClient.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${newAccessToken}`;
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken); // 대기 중인 모든 요청을 성공 처리
          return apiClient(originalRequest); // 원래 요청 재시도
        } catch (refreshError) {
          processQueue(refreshError as AxiosError, null); // 대기 중인 모든 요청을 실패 처리
          console.error("Refresh token failed:", refreshError);
          logout();
          toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
          window.location.href = "/login";
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        logout();
        toast.error("로그인이 필요합니다.");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
