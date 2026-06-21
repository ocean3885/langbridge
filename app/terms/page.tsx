import Link from 'next/link';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const content = {
  ko: {
    title: '이용약관',
    updated: '시행일: 2026년 6월 21일',
    intro: '본 약관은 랭브릿지가 제공하는 HolaLingo 서비스의 이용 조건을 정합니다.',
    sections: [
      ['1. 서비스 이용', '회원은 계정 정보를 정확하게 관리해야 하며, 서비스를 관련 법령과 본 약관에 따라 이용해야 합니다. 계정 공유, 서비스의 무단 복제·배포, 비정상적인 접근은 제한될 수 있습니다.'],
      ['2. 프리미엄 이용권', '프리미엄 상품은 30일 또는 12개월 동안 유료 콘텐츠에 접근할 수 있는 기간제 이용권입니다. 현재 상품은 일시 결제이며 자동으로 갱신되지 않습니다. 이용 기간은 결제 승인 시점부터 시작됩니다.'],
      ['3. 결제', '결제 금액과 이용 기간은 결제 전 화면에 표시됩니다. 결제는 토스페이먼츠 등 외부 결제사업자를 통해 처리되며, 결제수단 관련 조건은 해당 사업자의 정책을 따를 수 있습니다.'],
      ['4. 이용 제한', '서비스 운영을 방해하거나 타인의 권리를 침해하는 행위가 확인되면 사전 안내 후 이용을 제한할 수 있습니다. 긴급한 보안 위험이 있는 경우에는 선조치 후 안내할 수 있습니다.'],
      ['5. 서비스 변경', '콘텐츠와 기능은 품질 향상 및 운영상 필요에 따라 변경될 수 있습니다. 유료 이용에 중대한 영향을 주는 변경은 합리적인 방법으로 안내합니다.'],
      ['6. 책임과 문의', '회사는 고의 또는 과실로 이용자에게 발생한 손해에 대해 관계 법령에 따라 책임을 부담합니다. 서비스 문의는 ocean3885@gmail.com으로 접수할 수 있습니다.'],
      ['7. 사업자 정보', '상호: 랭브릿지(langbridge) · 대표: 박희복 · 사업자등록번호: 264-34-01855 · 주소: 부산광역시 사상구 삼덕로 39, 102호 · 연락처: +82 10-4005-6256'],
    ],
    refundLink: '환불정책 확인',
  },
  en: {
    title: 'Terms of Use',
    updated: 'Effective: June 21, 2026',
    intro: 'These terms govern the use of the HolaLingo service provided by Langbridge.',
    sections: [
      ['1. Use of the service', 'Users must keep account information accurate and use the service in accordance with applicable law and these terms. Account sharing, unauthorized copying or distribution, and abusive access may be restricted.'],
      ['2. Premium passes', 'Premium products are fixed-term passes providing access to paid content for 30 days or 12 months. They are one-time purchases and do not renew automatically. Access begins when payment is approved.'],
      ['3. Payment', 'The price and access period are shown before purchase. Payments are processed by external payment providers such as Toss Payments and may also be subject to their payment-method terms.'],
      ['4. Restrictions', 'Use may be restricted after notice if a user interferes with service operations or infringes another person’s rights. Immediate action may be taken when necessary to address an urgent security risk.'],
      ['5. Service changes', 'Content and features may change for quality and operational reasons. Material changes affecting paid access will be communicated through a reasonable method.'],
      ['6. Liability and contact', 'Langbridge is responsible for damages caused by its intentional misconduct or negligence as required by applicable law. Contact ocean3885@gmail.com for service questions.'],
      ['7. Business information', 'Business: langbridge · Representative: Park Heebok · Business registration number: 264-34-01855 · Address: 102, 39 Samdeok-ro, Sasang-gu, Republic of Korea · Phone: +82 10-4005-6256'],
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
