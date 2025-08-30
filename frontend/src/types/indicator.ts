// file: frontend/src/types/indicator.ts (최종 완성 버전)

/**
 * 단일 지표 파라미터의 속성을 정의합니다.
 */
export interface ParameterDefinition {
  key: string;
  label: string;
  type: "integer" | "float" | "string";
  default: number | string;
  step?: number;
  validation_range?: [number, number];
  optimization_range?: [number, number];
}

/**
 * 지표가 출력하는 값(라인)의 속성을 정의합니다.
 */
export interface OutputDefinition {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

/**
 * 백엔드 /indicators/metadata API로부터 받는 단일 지표의 전체 메타데이터 구조입니다.
 */
export interface IndicatorMetadata {
  key: string;
  kind: string;
  label: string;
  description: string;
  category: string;
  paneType: "overlay" | "pane";
  parameters: Record<string, ParameterDefinition>;
  outputs: OutputDefinition[];
  supportedTimeframes: string[];
  supportedLogics: string[];
  constraints?: string[];
}
