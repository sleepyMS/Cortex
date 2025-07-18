// file: frontend/src/lib/apiClient.ts

import axios, { AxiosError } from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// --- 요청 인터셉터 ---
// 모든 API 요청이 보내지기 전에 실행됩니다.
apiClient.interceptors.request.use(
  (config) => {
    // 향후 localStorage 등에서 JWT 토큰을 가져와 헤더에 추가합니다.
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- 응답 인터셉터 ---
// 모든 API 응답을 받은 후에 실행됩니다.
apiClient.interceptors.response.use(
  (response) => {
    // 응답 데이터가 있다면 그대로 반환합니다.
    return response;
  },
  (error: AxiosError) => {
    // HTTP 상태 코드가 2xx 범위를 벗어나는 경우 여기서 처리합니다.
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data);
      // 예: 401 Unauthorized 에러 시 로그인 페이지로 리디렉션
      if (error.response.status === 401) {
        // TODO: 토큰 갱신 로직 또는 로그아웃 처리
        console.log("인증이 만료되었습니다. 로그인이 필요합니다.");
        // window.location.href = '/login';
      }
    } else if (error.request) {
      // 요청은 성공했지만 응답을 받지 못한 경우 (네트워크 오류 등)
      console.error("Network Error:", error.message);
    } else {
      // 요청 설정 중에 에러가 발생한 경우
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export { apiClient };
