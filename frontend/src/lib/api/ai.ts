// file: src/lib/api/ai.ts
// AI 모델 관련 API 함수

import apiClient from "../apiClient";
import type {
  AIModelSummary,
  AIModelDetail,
  AIModelCreateRequest,
  AIModelCreateResponse,
  AITrainingJob,
  AIPredictionRequest,
  AIPredictionResponse,
  AIModelVersion,
  AIModelCostEstimationRequest,
  CostEstimationResponse,
} from "@/types/ai";

// AI 모델 목록 조회
export const getMyAIModels = async (params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AIModelSummary[]> => {
  const { data } = await apiClient.get<AIModelSummary[]>("/ai-models/", {
    params,
  });
  return data;
};

// 공개 AI 모델 목록 조회
export const getPublicAIModels = async (params?: {
  limit?: number;
  offset?: number;
}): Promise<AIModelSummary[]> => {
  const { data } = await apiClient.get<AIModelSummary[]>("/ai-models/public", {
    params,
  });
  return data;
};

// AI 모델 상세 조회
export const getAIModelDetail = async (
  modelId: string
): Promise<AIModelDetail> => {
  const { data } = await apiClient.get<AIModelDetail>(`/ai-models/${modelId}`);
  return data;
};

// AI 모델 생성 및 학습 시작
export const createAIModel = async (
  payload: AIModelCreateRequest
): Promise<AIModelCreateResponse> => {
  const { data } = await apiClient.post<AIModelCreateResponse>(
    "/ai-models/",
    payload
  );
  return data;
};

// 학습 상태 조회
export const getTrainingStatus = async (
  modelId: string
): Promise<AITrainingJob> => {
  const { data } = await apiClient.get<AITrainingJob>(
    `/ai-models/${modelId}/training-status`
  );
  return data;
};

// 예측 테스트
export const testPrediction = async (
  modelId: string,
  payload: AIPredictionRequest
): Promise<AIPredictionResponse> => {
  const { data } = await apiClient.post<AIPredictionResponse>(
    `/ai-models/${modelId}/predict`,
    payload
  );
  return data;
};

// 모델 삭제
export const deleteAIModel = async (modelId: string): Promise<void> => {
  await apiClient.delete(`/ai-models/${modelId}`);
};

// 모델 공개 설정 변경
export const setModelPublic = async (
  modelId: string,
  isPublic: boolean
): Promise<AIModelSummary> => {
  const { data } = await apiClient.patch<AIModelSummary>(
    `/ai-models/${modelId}/public`,
    null,
    { params: { is_public: isPublic } }
  );
  return data;
};

// 모델 다운로드 URL 생성
export const getModelDownloadUrl = (modelId: string): string => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
  return `${baseUrl}/ai-models/${modelId}/download`;
};

// AI 모델 버전 목록 조회
export const getAIModelVersions = async (
  modelId: string
): Promise<AIModelVersion[]> => {
  const { data } = await apiClient.get<AIModelVersion[]>(
    `/ai-models/${modelId}/versions`
  );
  return data;
};

// AI 모델 버전 활성화 (Rollback)
export const activateModelVersion = async (
  modelId: string,
  versionId: string
): Promise<void> => {
  await apiClient.post(`/ai-models/${modelId}/versions/${versionId}/activate`);
};

// 모델 수동 재학습 요청
export const retrainModel = async (
  modelId: string,
  range?: { startDate?: string; endDate?: string }
): Promise<AITrainingJob> => {
  const { data } = await apiClient.post<AITrainingJob>(
    `/ai-models/${modelId}/retrain`,
    {
      start_date: range?.startDate,
      end_date: range?.endDate,
    }
  );
  return data;
};

// 비용 견적
export const estimateAIModelCost = async (
  payload: AIModelCostEstimationRequest
): Promise<CostEstimationResponse> => {
  const { data } = await apiClient.post<CostEstimationResponse>(
    "/ai-models/cost-estimation",
    payload
  );
  return data;
};
