// file: frontend/src/app/[locale]/(auth)/privacy/page.tsx

import { LegalPageLayout } from "@/components/layout/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="개인정보처리방침" lastUpdated="2025년 12월 8일">
      {/* 서문 */}
      <section id="intro">
        <p>
          Cortex (이하 {'"'}회사{'"'})는 「개인정보 보호법」 제30조에 따라
          정보주체(이용자)의 개인정보를 보호하고 이와 관련한 고충을 신속하고
          원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을
          수립·공개합니다.
        </p>
        <p>
          본 방침은 2025년 12월 8일부터 적용되며, 법령 개정 및 회사 정책 변경에
          따라 내용이 변경될 수 있습니다.
        </p>
      </section>

      {/* 제1조 수집하는 개인정보 */}
      <section id="article-1">
        <h2>제1조 (수집하는 개인정보 항목 및 방법)</h2>
        <p>
          회사는 서비스 제공을 위해 필요한 최소한의 개인정보를 수집하고
          있습니다.
        </p>

        <h3>1. 필수 수집 항목</h3>
        <table className="w-full border-collapse border border-border mt-2">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left w-1/3">
                수집 목적
              </th>
              <th className="border border-border p-2 text-left">수집 항목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">
                회원가입 및 본인 확인
              </td>
              <td className="border border-border p-2">
                이메일 주소, 비밀번호(단방향 암호화)
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                서비스 이용 및 부정 이용 방지
              </td>
              <td className="border border-border p-2">
                접속 IP, 쿠키(Cookie), 접속 로그, 서비스 이용 기록, 기기
                정보(OS, 브라우저)
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">유료 서비스 결제</td>
              <td className="border border-border p-2">
                카드사명, 카드번호 일부(마스킹), 결제 승인 내역 (PG사 통해 처리)
              </td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-6">2. 선택 수집 항목</h3>
        <p className="text-sm text-muted-foreground mb-2">
          선택 항목 입력에 동의하지 않아도 서비스 이용 자체는 가능합니다.
        </p>
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left w-1/3">
                수집 목적
              </th>
              <th className="border border-border p-2 text-left">수집 항목</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">
                자동매매 및 조회 서비스
              </td>
              <td className="border border-border p-2">
                암호화폐 거래소 API Key (Access Key, Secret Key)
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">맞춤형 정보 제공</td>
              <td className="border border-border p-2">
                투자 성향 설문 결과, 관심 자산군
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                마케팅 활용 (별도 동의 시)
              </td>
              <td className="border border-border p-2">이메일, 휴대폰 번호</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-6">3. 개인정보 수집 방법</h3>
        <ul>
          <li>홈페이지 회원가입, 서비스 이용 과정에서 이용자가 직접 입력</li>
          <li>생성형 AI 및 자동화 도구를 통한 로그 수집</li>
          <li>제휴사로부터의 제공 (이용자 동의 하에)</li>
        </ul>
      </section>

      {/* 제2조 수집 및 이용 목적 */}
      <section id="article-2">
        <h2>제2조 (개인정보의 수집 및 이용 목적)</h2>
        <p>
          회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는
          개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이
          변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는
          등 필요한 조치를 이행할 예정입니다.
        </p>
        <ol>
          <li>
            <strong>회원 가입 및 관리:</strong> 회원제 서비스 이용에 따른
            본인확인, 개인식별, 가입의사 확인, 연령확인(만 19세 이상), 불만처리
            등 민원처리, 고지사항 전달
          </li>
          <li>
            <strong>재화 또는 서비스 제공:</strong> 투자 전략 분석, 백테스팅,
            자동매매 봇 구동, 콘텐츠 제공, 맞춤형 서비스 제공, 요금결제 및 정산
          </li>
          <li>
            <strong>마케팅 및 광고에의 활용:</strong> 신규 서비스(제품) 개발 및
            맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공,
            서비스의 유효성 확인, 접속빈도 파악 또는 회원의 서비스 이용에 대한
            통계
          </li>
          <li>
            <strong>AI 및 알고리즘 학습:</strong> 비식별 처리된 데이터를 활용한
            투자 전략 알고리즘 고도화 및 서비스 개선
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
          <li>
            원칙적으로, 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를
            지체 없이 파기합니다.
          </li>
        </ol>
        <table className="w-full border-collapse border border-border mt-4">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left">보유 정보</th>
              <th className="border border-border p-2 text-left">보유 기간</th>
              <th className="border border-border p-2 text-left">법적 근거</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">회원 가입 정보</td>
              <td className="border border-border p-2">회원 탈퇴 시까지</td>
              <td className="border border-border p-2">정보주체의 동의</td>
            </tr>
            <tr>
              <td className="border border-border p-2">부정 이용 내역</td>
              <td className="border border-border p-2">탈퇴 후 1년</td>
              <td className="border border-border p-2">회사 내부 방침</td>
            </tr>
            <tr>
              <td className="border border-border p-2">계약/청약철회 기록</td>
              <td className="border border-border p-2">5년</td>
              <td className="border border-border p-2">전자상거래법</td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                대금결제/재화공급 기록
              </td>
              <td className="border border-border p-2">5년</td>
              <td className="border border-border p-2">전자상거래법</td>
            </tr>
            <tr>
              <td className="border border-border p-2">
                소비자 불만/분쟁 기록
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
        <p>
          회사는 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」
          제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          현재 회사는 이용자의 개인정보를 외부 제3자에게 제공하지 않고 있습니다.
          향후 제휴 행사 등으로 제공이 필요할 경우 사전에 동의를 받겠습니다.
        </p>
      </section>

      {/* 제5조 처리 위탁 */}
      <section id="article-5">
        <h2>제5조 (개인정보 처리 위탁 및 국외 이전)</h2>
        <p>
          회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를
          위탁하고 있으며, 일부 정보는 클라우드 서비스 이용을 위해 국외로
          이전(저장)될 수 있습니다.
        </p>

        <h3 className="mt-4 text-base font-semibold">1. 국내 수탁 업체</h3>
        <table className="w-full border-collapse border border-border mt-2">
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
              <td className="border border-border p-2">토스페이먼츠(주)</td>
              <td className="border border-border p-2">
                결제 처리 및 에스크로 서비스
              </td>
            </tr>
            <tr>
              <td className="border border-border p-2">(주)누리고 (CoolSMS)</td>
              <td className="border border-border p-2">SMS/알림톡 발송</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mt-4 text-base font-semibold">
          2. 국외 이전 (클라우드 서비스)
        </h3>
        <table className="w-full border-collapse border border-border mt-2">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-2 text-left">
                업체명 (국가)
              </th>
              <th className="border border-border p-2 text-left">
                이전 항목 및 일시
              </th>
              <th className="border border-border p-2 text-left">
                이전 목적 및 기간
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-2">
                Amazon Web Services Inc. (미국, 일본, 한국 리전)
              </td>
              <td className="border border-border p-2">
                모든 개인정보
                <br />
                (서비스 이용 시 수시 전송)
              </td>
              <td className="border border-border p-2">
                데이터 보관 및 시스템 운영
                <br />
                (회원 탈퇴 시 또는 위탁 종료 시까지)
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 제6조 이용자의 권리 */}
      <section id="article-6">
        <h2>제6조 (정보주체와 법정대리인의 권리·의무 및 행사방법)</h2>
        <ol>
          <li>
            정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지
            요구 등의 권리를 행사할 수 있습니다.
          </li>
          <li>
            권리 행사는 회사에 대해 서면, 전자우편, 모사전송(FAX) 등을 통하여
            하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다. (서비스 내
            [설정] {">"} [계정 관리] 메뉴에서도 직접 가능합니다.)
          </li>
          <li>
            정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요청한
            경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를
            이용하거나 제공하지 않습니다.
          </li>
        </ol>
      </section>

      {/* 제6조의2 자동화된 결정 */}
      <section id="article-6-2">
        <h2>제6조의2 (자동화된 의사결정에 대한 권리 안내)</h2>
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 my-2">
          <p className="text-sm">
            회사는 효율적인 투자 전략 제공을 위해{" "}
            <strong>인공지능(AI) 및 알고리즘을 이용한 자동화된 분석</strong>을
            수행할 수 있습니다.
          </p>
        </div>
        <ol>
          <li>
            <strong>자동화된 결정의 내용:</strong> 회원의 투자 성향 분석 결과에
            따른 맞춤형 전략 추천, 자동매매 봇의 매수/매도 신호 발생 등.
          </li>
          <li>
            <strong>거부권 및 설명 요구권:</strong> 정보주체는 자신의 권리 또는
            의무에 중대한 영향을 미치는 자동화된 결정에 대해 거부하거나, 인적
            개입에 의한 재처리를 요구할 수 있습니다. 또한 해당 결정의 취지와
            결과에 대한 설명을 요구할 수 있습니다.
          </li>
          <li>
            <strong>행사 방법:</strong> 본 방침 제8조에 기재된 개인정보
            보호책임자 또는 고객센터로 연락주시면 성실히 조치하겠습니다.
          </li>
        </ol>
      </section>

      {/* 제6조의3 데이터 전송 요구권 */}
      <section id="article-6-3">
        <h2>제6조의3 (개인정보 전송 요구권 / MyData)</h2>
        <ol>
          <li>
            정보주체는 본인의 개인정보를 본인 또는 개인정보관리전문기관 등
            정보주체가 지정하는 제3자에게 전송해 줄 것을 요구할 수 있습니다.
            (개인정보 보호법 제35조의2, 2025년 3월 시행)
          </li>
          <li>
            회사는 정보주체의 전송 요구가 있는 경우, 기술적으로 가능한 범위
            내에서 컴퓨터 등 정보처리장치로 처리가 가능한 형태로 개인정보를
            전송합니다.
          </li>
          <li>
            <strong>대상 정보:</strong> 회원이 생성한 투자 전략 설정값, 백테스트
            결과 이력 등 (단, 회사의 영업비밀에 해당하는 분석 로직 등은 제외될
            수 있음)
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
            <strong>파기절차:</strong> 파기 사유가 발생한 개인정보를 선정하고,
            회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
          </li>
          <li>
            <strong>파기방법:</strong>
            <ul>
              <li>
                전자적 파일 형태: 복원이 불가능한 기술적 방법(Low Level Format
                등)을 이용하여 영구 삭제
              </li>
              <li>기록물, 인쇄물, 서면, 그 밖의 기록매체: 파쇄하거나 소각</li>
            </ul>
          </li>
        </ol>
      </section>

      {/* 제8조 안전성 확보 조치 */}
      <section id="article-8">
        <h2>제8조 (개인정보의 안전성 확보 조치)</h2>
        <p>
          회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고
          있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>
            <strong>관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원
            교육, 개인정보 취급자 최소화
          </li>
          <li>
            <strong>기술적 조치:</strong> 개인정보처리시스템 접근권한 관리,
            접근통제시스템 설치, 고유식별정보 및 API Key 암호화(AES-256),
            보안프로그램 설치, 접속기록 보관 및 위변조 방지
          </li>
          <li>
            <strong>물리적 조치:</strong> 전산실, 자료보관실 등의 비인가자 출입
            억제 및 잠금장치 사용
          </li>
        </ul>
      </section>

      {/* 제9조 행태정보 수집 */}
      <section id="article-9">
        <h2>제9조 (행태정보의 수집·이용 및 거부 등에 관한 사항)</h2>
        <ol>
          <li>
            회사는 서비스 이용과정에서 이용자에게 최적화된 맞춤형 정보 및 혜택
            제공, 온라인 맞춤형 광고 등을 위해 행태정보를 수집·이용하고
            있습니다.
          </li>
          <li>
            <strong>수집하는 행태정보의 항목:</strong> 이용자의 웹사이트 방문
            이력, 검색 이력, 클릭 이력 등
          </li>
          <li>
            <strong>거부 방법:</strong> 이용자는 브라우저의 설정을 변경하여 쿠키
            저장을 거부할 수 있습니다.
            <br /> - (예) Chrome: 설정 {">"} 개인정보 및 보안 {">"} 인터넷 사용
            기록 삭제
          </li>
        </ol>
      </section>

      {/* 제10조 보호책임자 */}
      <section id="article-10">
        <h2>제10조 (개인정보 보호책임자)</h2>
        <p>
          회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와
          관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이
          개인정보 보호책임자(CPO)를 지정하고 있습니다.
        </p>
        <div className="rounded-lg border border-border bg-muted/50 p-4 mt-4">
          <h3 className="font-semibold mb-2">개인정보 보호책임자</h3>
          <ul className="space-y-1 text-sm">
            <li>
              <strong>성명:</strong> 최민석
            </li>
            <li>
              <strong>직책:</strong> 대표 서비스 책임자
            </li>
            <li>
              <strong>연락처:</strong> support@cortex.com{" "}
            </li>
            <li className="text-xs text-muted-foreground mt-2">
              ※ 개인정보 보호 담당부서로 연결됩니다.
            </li>
          </ul>
        </div>
      </section>

      {/* 제11조 권익침해 구제방법 */}
      <section id="article-11">
        <h2>제11조 (권익침해 구제방법)</h2>
        <p>
          정보주체는 개인정보침해로 인한 구제를 받기 위하여
          개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에
          분쟁해결이나 상담 등을 신청할 수 있습니다.
        </p>
        <div className="rounded-lg border border-border bg-muted/50 p-4 mt-4">
          <ul className="text-sm space-y-2">
            <li>
              <strong>개인정보분쟁조정위원회:</strong> 1833-6972
              (www.kopico.go.kr)
            </li>
            <li>
              <strong>개인정보침해신고센터:</strong> 118 (privacy.kisa.or.kr)
            </li>
            <li>
              <strong>대검찰청:</strong> 1301 (www.spo.go.kr)
            </li>
            <li>
              <strong>경찰청:</strong> 182 (ecrm.cyber.go.kr)
            </li>
          </ul>
        </div>
      </section>

      {/* 제12조 처리방침 변경 */}
      <section id="article-12">
        <h2>제12조 (개인정보 처리방침 변경)</h2>
        <p>
          이 개인정보 처리방침은 2025년 12월 8일부터 적용됩니다. 법령 및 방침에
          따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일
          전부터 공지사항을 통하여 고지할 것입니다.
        </p>
      </section>

      {/* 부칙 */}
      <section id="addendum">
        <h2>부칙</h2>
        <ol>
          <li>공고일자: 2025년 12월 8일</li>
          <li>시행일자: 2025년 12월 8일</li>
        </ol>
      </section>
    </LegalPageLayout>
  );
}
