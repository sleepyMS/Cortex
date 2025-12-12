// file: frontend/src/lib/dateUtils.ts

/**
 * 중앙 집중식 시간대 유틸리티
 *
 * 모든 날짜/시간 표시를 한국 시간대(KST/Asia/Seoul)로 일관되게 포맷팅합니다.
 * 백테스트 차트, 거래 내역 테이블 등에서 사용됩니다.
 */

export const TIMEZONE = "Asia/Seoul";
export const LOCALE_KO = "ko-KR";
export const LOCALE_EN_CA = "en-CA"; // ISO 형식 (YYYY-MM-DD)

type DateFormatType = "date" | "datetime" | "short" | "time";

/**
 * UTC Unix timestamp (초 단위)를 KST 문자열로 변환합니다.
 *
 * @param timestamp - UTC Unix timestamp (초 단위)
 * @param format - 출력 형식
 *   - 'date': YYYY. MM. DD. (한국어) 또는 YYYY-MM-DD (영어)
 *   - 'datetime': YYYY. MM. DD. HH:MM
 *   - 'short': MM/DD HH:MM
 *   - 'time': HH:MM
 * @param useISOFormat - true일 경우 YYYY-MM-DD 형식 사용 (차트용)
 */
export function formatTimestampToKST(
  timestamp: number,
  format: DateFormatType = "date",
  useISOFormat: boolean = true
): string {
  const date = new Date(timestamp * 1000);
  return formatDateToKST(date, format, useISOFormat);
}

/**
 * Date 객체를 KST 문자열로 변환합니다.
 *
 * @param date - Date 객체 (UTC 또는 로컬)
 * @param format - 출력 형식
 * @param useISOFormat - true일 경우 YYYY-MM-DD 형식 사용 (차트용)
 */
export function formatDateToKST(
  date: Date,
  format: DateFormatType = "date",
  useISOFormat: boolean = true
): string {
  const locale = useISOFormat ? LOCALE_EN_CA : LOCALE_KO;

  const baseOptions: Intl.DateTimeFormatOptions = {
    timeZone: TIMEZONE,
  };

  switch (format) {
    case "date":
      return new Intl.DateTimeFormat(locale, {
        ...baseOptions,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);

    case "datetime":
      return new Intl.DateTimeFormat(locale, {
        ...baseOptions,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);

    case "short":
      return new Intl.DateTimeFormat(locale, {
        ...baseOptions,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);

    case "time":
      return new Intl.DateTimeFormat(locale, {
        ...baseOptions,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);

    default:
      return new Intl.DateTimeFormat(locale, {
        ...baseOptions,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
  }
}

/**
 * 차트 X축 표시용 날짜 포맷 (간결한 형식)
 *
 * @param timestamp - UTC Unix timestamp (초 단위)
 */
export function formatChartDate(timestamp: number): string {
  return formatTimestampToKST(timestamp, "date", true);
}

/**
 * 툴팁용 날짜/시간 포맷 (상세 형식)
 *
 * @param timestamp - UTC Unix timestamp (초 단위)
 */
export function formatTooltipDate(timestamp: number): string {
  return formatTimestampToKST(timestamp, "datetime", true);
}
