import Link from 'next/link';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const content = {
  ko: {
    title: '개인정보처리방침',
    updated: '시행일: 2026년 6월 21일',
    intro:
      '랭브릿지(langbridge)는 HolaLingo 서비스 제공에 필요한 범위에서 개인정보를 처리하며, 관계 법령에 따라 이용자의 개인정보를 보호합니다.',
    sections: [
      [
        '1. 수집하는 개인정보',
        '회원가입 및 계정 관리 과정에서 이메일 주소, 계정 식별자와 인증 정보를 처리합니다. 서비스 이용 과정에서는 학습 기록, 진도, 이용권 상태, 언어 설정, 접속 기록, IP 주소, 기기·브라우저 정보 및 쿠키가 자동으로 생성되거나 수집될 수 있습니다. 고객 문의 시 이용자가 제공한 이메일 주소와 문의 내용도 처리합니다.',
      ],
      [
        '2. 개인정보의 이용 목적',
        '개인정보는 회원 식별과 인증, 학습 서비스 및 맞춤형 진도 제공, 유료 이용권과 결제 상태 관리, 고객 문의 및 환불 처리, 서비스 보안과 부정 이용 방지, 장애 분석 및 서비스 개선, 법적 의무 이행을 위해 사용합니다.',
      ],
      [
        '3. 결제 정보와 Paddle',
        'HolaLingo의 결제는 Merchant of Record인 Paddle을 통해 처리될 수 있습니다. 카드번호 등 결제수단 정보는 Paddle이 직접 수집·처리하며, 랭브릿지는 주문 식별자, 구매 상품, 결제 금액, 결제·환불 상태 및 이용권 기간 등 서비스 제공에 필요한 거래 정보를 제공받을 수 있습니다. Paddle의 개인정보 처리에 관한 자세한 내용은 Paddle Privacy Policy를 확인해 주세요.',
      ],
      [
        '4. 개인정보 처리 위탁 및 외부 서비스',
        '서비스 운영을 위해 Supabase(회원 인증, 데이터베이스 및 파일 저장)와 Paddle(결제, 청구, 세금 처리, 환불 및 부정 결제 방지)을 이용할 수 있습니다. 각 서비스 제공자는 서비스 제공에 필요한 범위에서 정보를 처리하며, 국외에 위치한 서버 또는 법인에서 정보가 처리될 수 있습니다. 랭브릿지는 외부 서비스의 이용 범위가 변경되면 본 방침을 업데이트합니다.',
      ],
      [
        '5. 보유 및 파기',
        '개인정보는 회원 계정 유지 및 서비스 제공에 필요한 기간 동안 보유하며, 회원 탈퇴 또는 처리 목적 달성 후 지체 없이 삭제하거나 복구할 수 없는 방식으로 파기합니다. 다만 결제·계약 기록, 소비자 분쟁 처리 기록 등 관계 법령에서 일정 기간 보관을 요구하는 정보는 해당 기간 동안 별도로 보관할 수 있습니다.',
      ],
      [
        '6. 쿠키',
        '로그인 세션 유지, 보안 및 표시 언어 설정을 위해 필수 쿠키를 사용합니다. 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있으나, 필수 쿠키를 차단하면 로그인 등 일부 기능이 정상적으로 작동하지 않을 수 있습니다.',
      ],
      [
        '7. 이용자의 권리',
        '이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지 또는 동의 철회를 요청할 수 있습니다. 계정 삭제와 개인정보 관련 요청은 ocean3885@gmail.com으로 접수해 주세요. 본인 확인이 필요한 경우 추가 정보를 요청할 수 있으며, 관계 법령에 따라 처리 결과를 안내합니다.',
      ],
      [
        '8. 개인정보 보호 및 안전조치',
        '랭브릿지는 접근 권한 관리, 인증 정보 보호, 전송 구간 암호화(HTTPS), 서비스 제공자에 대한 접근 제한 등 개인정보 보호에 필요한 합리적인 기술적·관리적 조치를 적용합니다.',
      ],
      [
        '9. 아동의 개인정보',
        '서비스가 관계 법령상 보호자 동의가 필요한 연령의 아동을 대상으로 제공되는 경우, 필요한 동의를 받지 않고 개인정보를 고의로 수집하지 않습니다. 관련 사실을 알게 된 경우 해당 정보를 삭제하기 위한 조치를 취합니다.',
      ],
      [
        '10. 개인정보 보호책임자 및 사업자 정보',
        '개인정보 보호책임자: 박희복 · 상호: 랭브릿지(langbridge) · 사업자등록번호: 264-34-01855 · 주소: 부산광역시 사상구 삼덕로 39, 102호 · 이메일: ocean3885@gmail.com · 연락처: +82 10-4005-6256',
      ],
      [
        '11. 방침의 변경',
        '본 방침은 서비스 또는 법령의 변경에 따라 수정될 수 있습니다. 중요한 변경이 있는 경우 시행 전에 서비스 화면 또는 기타 합리적인 방법으로 안내합니다.',
      ],
    ],
    paddleLabel: 'Paddle 개인정보처리방침',
    termsLabel: '이용약관',
    refundLabel: '환불정책',
  },
  en: {
    title: 'Privacy Policy',
    updated: 'Effective: June 21, 2026',
    intro:
      'Langbridge processes personal information only as needed to provide HolaLingo and protects it in accordance with applicable law.',
    sections: [
      [
        '1. Information we collect',
        'When you create and use an account, we process your email address, account identifier, and authentication information. We may also collect learning history, progress, pass status, language preferences, access logs, IP address, device and browser information, and cookies. If you contact us, we process your email address and the contents of your request.',
      ],
      [
        '2. How we use information',
        'We use personal information to identify and authenticate users, provide learning features and progress, manage paid access and payment status, handle support and refunds, protect the service and prevent abuse, diagnose problems, improve HolaLingo, and comply with legal obligations.',
      ],
      [
        '3. Payments and Paddle',
        'HolaLingo payments may be processed by Paddle, our Merchant of Record. Payment-method details such as complete card numbers are collected and processed directly by Paddle. Langbridge may receive transaction information needed to provide the service, including an order identifier, purchased product, amount, payment or refund status, and access period. Please review the Paddle Privacy Policy for details about Paddle’s processing.',
      ],
      [
        '4. Service providers and international processing',
        'We may use Supabase for authentication, databases, and file storage, and Paddle for payments, billing, tax handling, refunds, and fraud prevention. These providers process information only as needed to perform their services. Information may be processed by servers or entities outside your country. We will update this policy if the scope of these services materially changes.',
      ],
      [
        '5. Retention and deletion',
        'We retain personal information while your account is active and for as long as needed to provide the service. After account deletion or completion of the relevant purpose, information is deleted or rendered unrecoverable without undue delay. Certain transaction, contract, or dispute records may be retained for the period required by applicable law.',
      ],
      [
        '6. Cookies',
        'We use essential cookies to maintain login sessions, protect the service, and remember display-language settings. You can block or delete cookies through your browser settings, but blocking essential cookies may prevent login or other features from working correctly.',
      ],
      [
        '7. Your rights',
        'Depending on applicable law, you may request access to, correction or deletion of, or restriction of processing of your personal information, or withdraw consent. Send account deletion and privacy requests to ocean3885@gmail.com. We may request information needed to verify your identity.',
      ],
      [
        '8. Security',
        'Langbridge applies reasonable technical and organizational safeguards, including access controls, protection of authentication information, encrypted transmission through HTTPS, and limiting provider access to what is needed to deliver the service.',
      ],
      [
        '9. Children’s privacy',
        'Where parental consent is required by applicable law, we do not knowingly collect a child’s personal information without the required consent. If we learn that this has occurred, we will take steps to delete the information.',
      ],
      [
        '10. Privacy contact and business information',
        'Privacy officer: Park Heebok · Business: langbridge · Business registration number: 264-34-01855 · Address: 102, 39 Samdeok-ro, Sasang-gu, Republic of Korea · Email: ocean3885@gmail.com · Phone: +82 10-4005-6256',
      ],
      [
        '11. Changes to this policy',
        'We may update this policy to reflect changes to the service or applicable law. Material changes will be announced through the service or another reasonable method before they take effect.',
      ],
    ],
    paddleLabel: 'Paddle Privacy Policy',
    termsLabel: 'Terms of Use',
    refundLabel: 'Refund Policy',
  },
};

export default async function PrivacyPolicyPage() {
  const language = await getDisplayLanguage();
  const t = content[language];

  return (
    <article className="mx-auto max-w-3xl py-8 sm:py-12">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">HolaLingo</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
        {t.title}
      </h1>
      <p className="mt-2 text-xs text-zinc-400">{t.updated}</p>
      <p className="mt-7 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{t.intro}</p>

      <div className="mt-10 space-y-9">
        {t.sections.map(([title, body]) => (
          <section key={title} id={title.includes('쿠키') || title.includes('Cookies') ? 'cookies' : undefined}>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        <a
          href="https://www.paddle.com/legal/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-4"
        >
          {t.paddleLabel}
        </a>
        <Link href="/terms" className="underline underline-offset-4">
          {t.termsLabel}
        </Link>
        <Link href="/refund-policy" className="underline underline-offset-4">
          {t.refundLabel}
        </Link>
      </div>
    </article>
  );
}
