// file: frontend/src/lib/apiClient.ts

import axios from "axios";

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
    const accessToken = localStorage.getItem("accessToken"); // accessToken으로 변경
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 에러 처리 및 토큰 갱신 로직 (나중에 구현)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // const originalRequest = error.config;
    // // 액세스 토큰 만료 에러 (예: 401 Unauthorized) 감지 및 리프레시 토큰으로 갱신 시도
    // if (error.response?.status === 401 && !originalRequest._retry) {
    //   originalRequest._retry = true; // 재시도 플래그 설정
    //   try {
    //     // 리프레시 토큰으로 새로운 액세스 토큰 요청 (백엔드 /auth/refresh 엔드포인트 호출)
    //     // const refreshToken = localStorage.getItem('refresh_token');
    //     // const response = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
    //     // const { access_token, refresh_token: new_refresh_token } = response.data;

    //     // // 새 토큰 저장
    //     // localStorage.setItem('access_token', access_token);
    //     // if (new_refresh_token) {
    //     //   localStorage.setItem('refresh_token', new_refresh_token);
    //     // }

    //     // // 원래 요청 재시도
    //     // originalRequest.headers.Authorization = `Bearer ${access_token}`;
    //     // return apiClient(originalRequest);

    //   } catch (refreshError) {
    //     // 리프레시 토큰 갱신 실패 (예: 리프레시 토큰 만료)
    //     // 사용자 로그아웃 처리 (로그인 페이지로 리디렉션 등)
    //     // localStorage.removeItem('access_token');
    //     // localStorage.removeItem('refresh_token');
    //     // window.location.href = '/login';
    //     return Promise.reject(refreshError);
    //   }
    // }
    return Promise.reject(error);
  }
);

export default apiClient;
