// file: frontend/src/app/[locale]/(auth)/privacy/page.tsx

import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="개인정보처리방침" lastUpdated="2024년 12월 8일">
      {/* 서문 */}
      <section id="intro">
        <p>
          Cortex (이하 "회사")는 「개인정보 보호법」에 따라 이용자의 개인정보
          보호 및 권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게
          처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.
        </p>
        <p>
          회사는 개인정보처리방침을 개정하는 경우 웹사이트 공지사항(또는
          개별공지)을 통하여 공지할 것입니다.
        </p>
      </section>

      {/* 제1조 수집하는 개인정보 */}
      <section id="article-1">
        <h2>제1조 (수집하는 개인정보 항목)</h2>
        <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>

        <h3>1. 필수 수집 항목</h3>
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left">수집 목적</th>
              <th className="border border-border p-2 text-left">수집 항목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">
                회원가입 및 본인 확인
              </td>
              <td className="border border-border p-2">
                이메일 주소, 비밀번호(암호화 저장)
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">서비스 제공</td>
              <td className="border border-border p-2">
                서비스 이용 기록, 거래 내역
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-6">2. 선택 수집 항목</h3>
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left">수집 목적</th>
              <th className="border border-border p-2 text-left">수집 항목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">자동매매 서비스</td>
              <td className="border border-border p-2">
                거래소 API 키 (암호화 저장)
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">프로필 설정</td>
              <td className="border border-border p-2">
                사용자명, 자기소개, 소셜 링크
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-6">3. 자동 수집 항목</h3>
        <p>서비스 이용 과정에서 다음 정보가 자동으로 생성되어 수집됩니다:</p>
        <ul>
          <li>접속 IP 주소, 접속 로그, 쿠키</li>
          <li>기기 정보 (브라우저 종류, OS 등)</li>
          <li>서비스 이용 기록 (백테스트 실행 기록, 봇 운영 기록 등)</li>
        </ul>
      </section>

      {/* 제2조 수집 및 이용 목적 */}
      <section id="article-2">
        <h2>제2조 (개인정보의 수집 및 이용 목적)</h2>
        <p>회사는 수집한 개인정보를 다음의 목적으로 이용합니다:</p>
        <ol>
          <li>
            <strong>회원 관리:</strong> 회원제 서비스 이용에 따른 본인확인,
            개인식별, 불량회원의 부정이용 방지, 가입의사 확인, 연령확인,
            불만처리 등 민원처리
          </li>
          <li>
            <strong>서비스 제공:</strong> 콘텐츠 제공, 백테스트 실행, 자동매매
            봇 운영, 크레딧 관리, 맞춤 서비스 제공
          </li>
          <li>
            <strong>결제 및 정산:</strong> 유료 서비스 결제, 구독 관리, 환불
            처리
          </li>
          <li>
            <strong>마케팅 및 광고:</strong> 이벤트 안내, 광고성 정보 제공 (별도
            동의 시)
          </li>
          <li>
            <strong>서비스 개선:</strong> 신규 서비스 개발, 접속 빈도 분석,
            서비스 이용 통계
          </li>
        </ol>
      </section>

      {/* 제3조 보유 및 이용 기간 */}
      <section id="article-3">
        <h2>제3조 (개인정보의 보유 및 이용 기간)</h2>
        <ol>
          <li>
            회사는 법령에 따른 개인정보 보유·이용기간 또는 이용자로부터
            개인정보를 수집 시 동의 받은 개인정보 보유·이용기간 내에서
            개인정보를 처리·보유합니다.
          </li>
          <li>각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:</li>
        </ol>
        <table className="w-full border-collapse border border-border mt-4">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left">보유 정보</th>
              <th className="border border-border p-2 text-left">보유 기간</th>
              <th className="border border-border p-2 text-left">근거</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">회원 정보</td>
              <td className="border border-border p-2">회원 탈퇴 시까지</td>
              <td className="border border-border p-2">서비스 이용약관</td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                계약 또는 청약철회 기록
              </td>
              <td className="border border-border p-2">5년</td>
              <td className="border border-border p-2">전자상거래법</td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                결제 및 재화 공급 기록
              </td>
              <td className="border border-border p-2">5년</td>
              <td className="border border-border p-2">전자상거래법</td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                소비자 불만 또는 분쟁 처리 기록
              </td>
              <td className="border border-border p-2">3년</td>
              <td className="border border-border p-2">전자상거래법</td>
            </tr>
            <tr>
              <td className="border border-border p-2">웹사이트 방문 기록</td>
              <td className="border border-border p-2">3개월</td>
              <td className="border border-border p-2">통신비밀보호법</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 제4조 제3자 제공 */}
      <section id="article-4">
        <h2>제4조 (개인정보의 제3자 제공)</h2>
        <ol>
          <li>
            회사는 이용자의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며,
            이용자의 동의 없이 제3자에게 제공하지 않습니다.
          </li>
          <li>
            다만, 다음의 경우에는 예외로 합니다:
            <ul>
              <li>이용자가 사전에 동의한 경우</li>
              <li>
                법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와
                방법에 따라 수사기관의 요구가 있는 경우
              </li>
            </ul>
          </li>
        </ol>
      </section>

      {/* 제5조 처리 위탁 */}
      <section id="article-5">
        <h2>제5조 (개인정보 처리 위탁)</h2>
        <p>
          회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를
          위탁하고 있습니다:
        </p>
        <table className="w-full border-collapse border border-border mt-4">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left">수탁업체</th>
              <th className="border border-border p-2 text-left">
                위탁 업무 내용
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">
                토스페이먼츠(Toss Payments)
              </td>
              <td className="border border-border p-2">전자결제 대행</td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                클라우드 서비스 제공업체
              </td>
              <td className="border border-border p-2">
                서버 호스팅 및 데이터 저장
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4">
          회사는 위탁계약 체결 시 관련 법령에 따라 위탁업무 수행목적 외 개인정보
          처리금지, 기술적·관리적 보호조치, 위탁업무의 목적 및 범위 등에 관한
          사항을 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를
          감독합니다.
        </p>
      </section>

      {/* 제6조 이용자의 권리 */}
      <section id="article-6">
        <h2>제6조 (이용자 및 법정대리인의 권리와 행사 방법)</h2>
        <ol>
          <li>
            이용자는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를
            행사할 수 있습니다:
            <ul>
              <li>개인정보 열람 요청</li>
              <li>오류 등이 있을 경우 정정 요청</li>
              <li>삭제 요청</li>
              <li>처리정지 요청</li>
            </ul>
          </li>
          <li>
            권리 행사는 서비스 내 설정 메뉴 또는 서면, 전자우편 등을 통하여 하실
            수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.
          </li>
          <li>
            권리 행사는 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실
            수도 있습니다. 이 경우 개인정보 보호법 시행규칙 별지 제11호 서식에
            따른 위임장을 제출하셔야 합니다.
          </li>
          <li>
            이용자가 개인정보의 오류 등에 대한 정정 또는 삭제를 요청한 경우에는
            회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나
            제공하지 않습니다.
          </li>
          <li>
            만 14세 미만 아동의 경우 법정대리인이 아동의 개인정보를 조회하거나
            수정할 권리, 수집 및 이용 동의를 철회할 권리를 가집니다.
          </li>
        </ol>
      </section>

      {/* 제7조 파기 절차 */}
      <section id="article-7">
        <h2>제7조 (개인정보의 파기)</h2>
        <ol>
          <li>
            회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가
            불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.
          </li>
          <li>
            이용자로부터 동의 받은 개인정보 보유기간이 경과하거나 처리목적이
            달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야
            하는 경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나
            보관장소를 달리하여 보존합니다.
          </li>
          <li>
            개인정보 파기의 절차 및 방법은 다음과 같습니다:
            <ul>
              <li>
                <strong>파기 절차:</strong> 불필요한 개인정보 및 개인정보파일은
                개인정보보호책임자의 책임 하에 내부 방침 및 관련 법령에 따라
                파기합니다.
              </li>
              <li>
                <strong>파기 방법:</strong> 전자적 파일 형태의 정보는 기록을
                재생할 수 없는 기술적 방법을 사용합니다.
              </li>
            </ul>
          </li>
        </ol>
      </section>

      {/* 제8조 개인정보 보호책임자 */}
      <section id="article-8">
        <h2>제8조 (개인정보 보호책임자)</h2>
        <p>
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와
          관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보
          보호책임자를 지정하고 있습니다.
        </p>
        <div className="rounded-lg border border-border bg-muted/50 p-4 mt-4">
          <h3 className="font-semibold mb-2">개인정보 보호책임자</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <strong>성명:</strong> [담당자명]
            </li>
            <li>
              <strong>직책:</strong> [직책]
            </li>
            <li>
              <strong>연락처:</strong> support@cortex.com
            </li>
          </ul>
        </div>
        <p className="mt-4">
          이용자는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련
          문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자에게
          문의하실 수 있습니다. 회사는 이용자의 문의에 대해 지체 없이 답변 및
          처리해드릴 것입니다.
        </p>
      </section>

      {/* 제9조 안전성 확보 조치 */}
      <section id="article-9">
        <h2>제9조 (개인정보의 안전성 확보 조치)</h2>
        <p>
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
          있습니다:
        </p>
        <ol>
          <li>
            <strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원
            교육
          </li>
          <li>
            <strong>기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리,
            접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치
          </li>
          <li>
            <strong>물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제
          </li>
        </ol>
        <div className="rounded-lg border border-border bg-muted/50 p-4 mt-4">
          <h4 className="font-semibold mb-2">🔒 암호화 적용 항목</h4>
          <ul className="text-sm space-y-1">
            <li>비밀번호: bcrypt 해시 암호화</li>
            <li>거래소 API 키: AES-256 암호화</li>
            <li>통신 구간: TLS 1.3 암호화</li>
          </ul>
        </div>
      </section>

      {/* 제10조 쿠키 사용 */}
      <section id="article-10">
        <h2>제10조 (쿠키의 설치, 운영 및 거부)</h2>
        <ol>
          <li>
            회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를
            저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.
          </li>
          <li>
            쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에게
            보내는 소량의 정보이며, 이용자의 컴퓨터 하드디스크에 저장됩니다.
          </li>
          <li>
            회사는 다음과 같은 목적으로 쿠키를 사용합니다:
            <ul>
              <li>회원과 비회원의 접속 빈도나 방문 시간 등 분석</li>
              <li>이용자의 관심분야 파악 및 맞춤 서비스 제공</li>
              <li>로그인 상태 유지</li>
            </ul>
          </li>
          <li>
            이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저에서
            옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다
            확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
          </li>
          <li>
            쿠키 저장을 거부할 경우, 로그인이 필요한 일부 서비스 이용에 어려움이
            있을 수 있습니다.
          </li>
        </ol>
      </section>

      {/* 제11조 처리방침 변경 */}
      <section id="article-11">
        <h2>제11조 (개인정보 처리방침 변경)</h2>
        <ol>
          <li>
            이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른
            변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일
            전부터 공지사항을 통하여 고지할 것입니다.
          </li>
          <li>
            이용자에게 불리한 내용으로 변경되는 경우에는 시행 30일 전부터 이메일
            등으로 개별 통지합니다.
          </li>
        </ol>
      </section>

      {/* 제12조 권익침해 구제방법 */}
      <section id="article-12">
        <h2>제12조 (권익침해 구제방법)</h2>
        <p>
          이용자는 개인정보침해로 인한 구제를 받기 위하여
          개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에
          분쟁해결이나 상담 등을 신청할 수 있습니다.
        </p>
        <div className="rounded-lg border border-border bg-muted/50 p-4 mt-4">
          <h4 className="font-semibold mb-2">관련 기관 연락처</h4>
          <ul className="text-sm space-y-2">
            <li>
              <strong>개인정보분쟁조정위원회:</strong> (국번없이) 1833-6972 |{" "}
              <a
                href="https://www.kopico.go.kr"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.kopico.go.kr
              </a>
            </li>
            <li>
              <strong>개인정보침해신고센터:</strong> (국번없이) 118 |{" "}
              <a
                href="https://privacy.kisa.or.kr"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                privacy.kisa.or.kr
              </a>
            </li>
            <li>
              <strong>대검찰청:</strong> (국번없이) 1301 |{" "}
              <a
                href="https://www.spo.go.kr"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.spo.go.kr
              </a>
            </li>
            <li>
              <strong>경찰청:</strong> (국번없이) 182 |{" "}
              <a
                href="https://ecrm.cyber.go.kr"
                className="text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                ecrm.cyber.go.kr
              </a>
            </li>
          </ul>
        </div>
      </section>

      {/* 부칙 */}
      <section id="addendum">
        <h2>부칙</h2>
        <ol>
          <li>이 개인정보처리방침은 2024년 12월 8일부터 시행됩니다.</li>
        </ol>
      </section>
    </LegalPageLayout>
  );
}
