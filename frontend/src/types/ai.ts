// file: src/types/ai.ts
// AI 모델 관련 TypeScript 타입 정의

// AI 모델 상태
export type AIModelStatus = "pending" | "training" | "completed" | "failed";

// 기술적 지표 설정
export interface AIIndicatorConfig {
  type: string; // RSI, EMA, MACD, BB, ATR 등
  params: Record<string, any>;
}

// 피처 설정
export interface AIFeatureConfig {
  sequenceLength: number;
  useOhlcv: boolean;
  ohlcvColumns: string[];
  indicators: AIIndicatorConfig[];
  useReturns: boolean;
  useLogReturns: boolean;
}

// 라벨링 설정 (Triple Barrier)
export interface AILabelingConfig {
  method: string;
  horizon: number;
  profitTarget: number;
  stopLoss: number;
}

// 아키텍처 설정
export interface AIArchitectureConfig {
  hiddenSize: number;
  numLayers: number;
  dropout: number;
  bidirectional: boolean;
}

// 학습 설정
export interface AITrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  earlyStoppingPatience: number;
  validationSplit: number;
}

// AI 모델 생성 요청
export interface AIModelCreateRequest {
  name: string;
  description?: string;
  modelType: string;
  architectureConfig: AIArchitectureConfig;
  featureConfig: AIFeatureConfig;
  labelingConfig: AILabelingConfig;
  trainingConfig: AITrainingConfig;
  trainingSymbol: string;
  trainingTimeframe: string;
  trainingStartDate: string;
  trainingEndDate: string;
}

// 학습 작업 응답
export interface AITrainingJob {
  id: string;
  modelId: string;
  status: string;
  progressPct: number;
  currentEpoch?: number;
  totalEpochs?: number;
  currentMetrics?: {
    trainLoss?: number;
    valLoss?: number;
    phase?: string;
  };
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// AI 모델 버전
export interface AIModelVersion {
  id: string;
  modelId: string;
  versionNumber: number;
  createdAt: string;
  trainingStartDate: string;
  trainingEndDate: string;
  metrics?: any;
  isActive: boolean;
}

// AI 모델 요약 (목록용)
export interface AIModelSummary {
  id: string;
  name: string;
  description?: string;
  modelType: string;
  status: AIModelStatus;
  trainingSymbol: string;
  trainingTimeframe: string;
  trainingStartDate: string;
  trainingEndDate: string;
  isPublic: boolean;
  createdAt: string;
}

// AI 모델 상세
export interface AIModelDetail extends AIModelSummary {
  userId: string;
  architectureConfig: AIArchitectureConfig;
  featureConfig: AIFeatureConfig;
  labelingConfig: AILabelingConfig;
  trainingConfig: AITrainingConfig;
  trainingMetrics?: {
    accuracy?: number;
    f1Macro?: number;
    precisionMacro?: number;
    recallMacro?: number;
    confusionMatrix?: number[][];
  };
  validationMetrics?: {
    labelStats?: {
      totalSamples: number;
      buyCount: number;
      holdCount: number;
      sellCount: number;
      buyRatio: number;
      holdRatio: number;
      sellRatio: number;
    };
    bestEpoch?: number;
    bestValLoss?: number;
    featureImportance?: Record<string, number>;
  };
  performanceMetrics?: {
    accuracy: number;
    f1Score: number;
    validationLoss?: number;
    classWiseMetrics?: {
      [key: string]: {
        precision: number;
        recall: number;
        f1: number;
      };
    };
  };
  modelWeightsPath?: string;
  updatedAt?: string;
  latestTrainingJob?: AITrainingJob;

  // Auto Retrain & Versioning
  isAutoRetrainEnabled?: boolean;
  retrainIntervalDays?: number;
  retrainDataWindowDays?: number;
  nextRetrainAt?: string;
  activeVersionId?: string;
}

// 모델 생성 응답
export interface AIModelCreateResponse {
  model: AIModelSummary;
  trainingJob: AITrainingJob;
  taskId: string;
}

// 예측 요청
export interface AIPredictionRequest {
  symbol: string;
  timeframe: string;
}

// 예측 응답
export interface AIPredictionResponse {
  buyProbability: number;
  holdProbability: number;
  sellProbability: number;
  predictedClass: number;
  predictedLabel: "BUY" | "HOLD" | "SELL";
}

export interface AIModelCostEstimationRequest {
  trainingType: "new" | "retrain";
  startDate?: string;
  endDate?: string;
  timeframe?: string;
  epochs?: number;
  modelId?: string;
  hiddenSize?: number;
  numLayers?: number;
}

export interface CostEstimationResponse {
  originalCost: number;
  discountPct: number;
  finalCost: number;
  userBalance: number;
  isSufficient: boolean;
}

// 기본 설정값들
export const DEFAULT_ARCHITECTURE_CONFIG: AIArchitectureConfig = {
  hiddenSize: 64,
  numLayers: 2,
  dropout: 0.2,
  bidirectional: false,
};

export const DEFAULT_FEATURE_CONFIG: AIFeatureConfig = {
  sequenceLength: 60,
  useOhlcv: true,
  ohlcvColumns: ["open", "high", "low", "close", "volume"],
  indicators: [], // Empty by default - user selects indicators in Step 3
  useReturns: true,
  useLogReturns: true,
};

export const DEFAULT_LABELING_CONFIG: AILabelingConfig = {
  method: "triple_barrier",
  horizon: 24,
  profitTarget: 0.02,
  stopLoss: 0.01,
};

export const DEFAULT_TRAINING_CONFIG: AITrainingConfig = {
  epochs: 100,
  batchSize: 64,
  learningRate: 0.001,
  earlyStoppingPatience: 10,
  validationSplit: 0.2,
};
