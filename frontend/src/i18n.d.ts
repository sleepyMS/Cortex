// file: frontend/src/i18n.d.ts

// ko.json 파일의 전체 구조를 임포트합니다.
import koMessages from "./messages/ko.json";

// ko.json 파일의 타입을 'Messages'라는 별칭으로 지정합니다.
type Messages = typeof koMessages;

// next-intl이 전역적으로 사용할 IntlMessages 인터페이스를
// 우리가 임포트한 'Messages' 타입으로 확장합니다.
declare global {
  interface IntlMessages extends Messages {}
}
