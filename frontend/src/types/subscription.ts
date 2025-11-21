// file: frontend/src/types/subscription.ts

/**
 * 구독 플랜별 상세 기능 제한을 정의합니다.
 * (DB의 plan_features 테이블에 해당)
 */
export interface PlanFeatures {
  /** 생성 가능한 최대 전략 개수 */
  maxStrategies: number;
  /** 동시에 실행 가능한 자동매매 봇의 최대 개수 */
  liveBotsLimit: number;
  /** 하루에 실행할 수 있는 백테스트 최대 횟수 */
  dailyBacktestCount: number;
  /** 지원되는 차트 타임프레임 목록 (e.g., ["1h", "4h", "1d"]) */
  supportedTimeframes: string[];
  /** 커뮤니티 기능 접근 가능 여부 */
  communityAccess: boolean;
  /** 전략 최적화 등 고급 기능 접근 가능 여부 */
  advancedFeaturesAccess: boolean;
}

/**
 * 단일 구독 플랜의 정보를 정의합니다.
 * (DB의 plans 테이블에 해당)
 */
export interface Plan {
  /** 플랜의 고유 ID (UUID) */
  id: string;
  /** 플랜 이름 (e.g., "Basic", "Trader", "Pro") */
  name: string;
  /** 월간 구독 가격 (USD) */
  price: number;
  /** 이 플랜이 제공하는 상세 기능 목록 */
  features: PlanFeatures;
}

/**
 * 사용자의 현재 구독 상태 정보를 정의합니다.
 * (DB의 subscriptions 테이블에 해당)
 */
export interface Subscription {
  /** 구독 정보의 고유 ID (UUID) */
  id: string;
  /** 사용자의 고유 ID (UUID) */
  userId: string;
  /** 구독 중인 플랜의 고유 ID (UUID) */
  planId: string;
  /**
   * 현재 구독 상태
   * - 'active': 정상적으로 구독 중
   * - 'canceled': 구독이 취소되었으며, 기간 만료 시 종료됨
   * - 'past_due': 결제 실패로 인해 연체됨
   * - 'unpaid': 최종적으로 미납 처리됨
   */
  status: "active" | "canceled" | "past_due" | "unpaid";
  /** 현재 구독 기간의 만료일 (ISO 8601 형식의 날짜 문자열) */
  currentPeriodEnd: string;
  /** 구독 생성일 (ISO 8601 형식의 날짜 문자열) */
  createdAt: string;
  /** 마지막 정보 업데이트일 (ISO 8601 형식의 날짜 문자열) */
  updatedAt: string;
  /** 구독 중인 플랜의 상세 정보 (API 응답에 포함) */
  plan: Plan;
  /** 결제 빌링키 (카드 등록 여부 확인용) */
  paymentGatewayCustomerKey?: string;
  /** 다음 결제 주기에 변경될 플랜 ID (다운그레이드 예약용) */
  nextPlanId?: string;
  /** 다음 결제 주기에 변경될 플랜 상세 정보 (다운그레이드 예약용) */
  nextPlan?: Plan;
}
