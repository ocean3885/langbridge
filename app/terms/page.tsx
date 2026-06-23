import Link from 'next/link';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const content = {
  ko: {
    title: '이용약관',
    updated: '시행일: 2026년 6월 23일',
    intro: '본 약관은 랭브릿지가 제공하는 HolaLingo 서비스의 이용 조건을 정합니다.',
    sections: [
      ['1. 서비스 이용', '회원은 계정 정보를 정확하게 관리해야 하며, 서비스를 관련 법령과 본 약관에 따라 이용해야 합니다. 계정 공유, 서비스의 무단 복제·배포, 비정상적인 접근은 제한될 수 있습니다.'],
      ['2. 프리미엄 구독', '프리미엄은 월간 또는 연간 단위로 제공되는 정기구독 상품입니다. 최초 결제가 승인되면 프리미엄 이용이 시작되며, 회원이 해지할 때까지 선택한 결제 주기에 따라 자동으로 갱신됩니다.'],
      ['3. 결제 및 세금', '기본 구독료는 결제 전 화면에 미국 달러(USD)로 표시됩니다. 결제는 Paddle을 통해 처리되며, 회원의 위치와 관련 세법에 따라 세금이 가격에 포함되거나 결제 단계에서 추가될 수 있습니다. 실제 청구 통화, 세금 및 최종 결제 금액은 Paddle 결제창에 표시된 내용을 기준으로 합니다.'],
      ['4. 구독 해지', '회원은 프로필의 구독 관리 기능을 통해 언제든 구독을 해지할 수 있습니다. 별도 안내가 없는 한 해지는 현재 결제 기간 종료 시 적용되며, 종료일까지 프리미엄 기능을 이용할 수 있습니다. 다음 갱신 결제를 방지하려면 갱신일 전에 해지를 완료해야 합니다.'],
      ['5. 이용 제한', '서비스 운영을 방해하거나 타인의 권리를 침해하는 행위가 확인되면 사전 안내 후 이용을 제한할 수 있습니다. 긴급한 보안 위험이 있는 경우에는 선조치 후 안내할 수 있습니다.'],
      ['6. 서비스 변경', '콘텐츠와 기능은 품질 향상 및 운영상 필요에 따라 변경될 수 있습니다. 유료 이용에 중대한 영향을 주는 변경은 합리적인 방법으로 안내합니다.'],
      ['7. 책임과 문의', '회사는 고의 또는 과실로 이용자에게 발생한 손해에 대해 관계 법령에 따라 책임을 부담합니다. 서비스 문의는 ocean3885@gmail.com으로 접수할 수 있습니다.'],
      ['8. 사업자 정보', '상호: 랭브릿지(langbridge) · 대표: 박희복 · 사업자등록번호: 264-34-01855 · 주소: 부산광역시 사상구 삼덕로 39, 102호 · 연락처: +82 10-4005-6256'],
    ],
    refundLink: '환불정책 확인',
  },
  en: {
    title: 'Terms of Use',
    updated: 'Effective: June 23, 2026',
    intro: 'These terms govern the use of the HolaLingo service provided by Langbridge.',
    sections: [
      ['1. Use of the service', 'Users must keep account information accurate and use the service in accordance with applicable law and these terms. Account sharing, unauthorized copying or distribution, and abusive access may be restricted.'],
      ['2. Premium subscription', 'Premium is a recurring subscription offered on a monthly or yearly basis. Premium access begins when the initial payment is approved and renews automatically at the selected interval until canceled.'],
      ['3. Payment and taxes', 'The base subscription price is shown in U.S. dollars (USD) before checkout. Payments are processed through Paddle. Depending on the customer’s location and applicable tax rules, taxes may be included in the displayed price or added at checkout. The currency, taxes, and final amount shown in Paddle Checkout govern the charge.'],
      ['4. Cancellation', 'Users may cancel at any time through subscription management in their profile. Unless otherwise stated, cancellation takes effect at the end of the current billing period and Premium access remains available until then. Cancellation must be completed before the renewal date to prevent the next charge.'],
      ['5. Restrictions', 'Use may be restricted after notice if a user interferes with service operations or infringes another person’s rights. Immediate action may be taken when necessary to address an urgent security risk.'],
      ['6. Service changes', 'Content and features may change for quality and operational reasons. Material changes affecting paid access will be communicated through a reasonable method.'],
      ['7. Liability and contact', 'Langbridge is responsible for damages caused by its intentional misconduct or negligence as required by applicable law. Contact ocean3885@gmail.com for service questions.'],
      ['8. Business information', 'Business: langbridge · Representative: Park Heebok · Business registration number: 264-34-01855 · Address: 102, 39 Samdeok-ro, Sasang-gu, Republic of Korea · Phone: +82 10-4005-6256'],
    ],
    refundLink: 'View Refund Policy',
  },
};

export default async function TermsPage() {
  const language = await getDisplayLanguage();
  const t = content[language];

  return (
    <article className="mx-auto max-w-3xl py-8 sm:py-12">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">HolaLingo</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{t.title}</h1>
      <p className="mt-2 text-xs text-zinc-400">{t.updated}</p>
      <p className="mt-7 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{t.intro}</p>
      <div className="mt-10 space-y-9">
        {t.sections.map(([title, body]) => (
          <section key={title}>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">{body}</p>
          </section>
        ))}
      </div>
      <Link href="/refund-policy" className="mt-10 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
        {t.refundLink}
      </Link>
    </article>
  );
}
