import Link from 'next/link';
import { getDisplayLanguage } from '@/lib/auth/app-user';

const content = {
  ko: {
    title: '환불정책',
    updated: '시행일: 2026년 6월 21일',
    intro: '환불은 이용 이력, 결제수단 및 관계 법령을 기준으로 처리됩니다.',
    sections: [
      ['1. 환불 요청', '결제일, 계정 이메일, 주문 정보를 포함하여 ocean3885@gmail.com으로 요청해 주세요. 확인을 위해 추가 정보를 요청할 수 있습니다.'],
      ['2. 이용 전 청약철회', '결제 후 서비스를 이용하지 않은 경우 관계 법령이 정한 기간과 요건에 따라 전액 환불을 요청할 수 있습니다.'],
      ['3. 이용을 시작한 경우', '프리미엄 콘텐츠를 열람하거나 학습 기능을 사용한 경우 디지털콘텐츠의 제공이 시작된 것으로 볼 수 있습니다. 이 경우 청약철회가 제한되거나 실제 이용분 등을 공제한 금액이 환불될 수 있으며, 구체적인 금액은 이용 이력과 관계 법령에 따라 안내합니다.'],
      ['4. 서비스 하자', '서비스의 중대한 하자 또는 회사의 귀책사유로 정상적인 이용이 어려운 경우 관계 법령에 따라 재이용 제공, 이용 기간 연장 또는 환불을 진행합니다.'],
      ['5. 처리 기간', '환불 승인 후 결제수단에 따라 실제 환급까지 영업일 기준 수일이 걸릴 수 있습니다. 결제사업자의 처리 일정에 따라 기간이 달라질 수 있습니다.'],
      ['6. 자동 갱신', '현재 제공되는 30일 및 12개월 이용권은 일시 결제 상품으로 자동 갱신되지 않습니다. 이용 기간 종료 후 별도의 추가 결제는 발생하지 않습니다.'],
    ],
    termsLink: '이용약관 확인',
  },
  en: {
    title: 'Refund Policy',
    updated: 'Effective: June 21, 2026',
    intro: 'Refunds are handled based on usage history, payment method, and applicable law.',
    sections: [
      ['1. Requesting a refund', 'Email ocean3885@gmail.com with the payment date, account email, and order details. Additional information may be requested for verification.'],
      ['2. Before using the service', 'If you have not used the service after payment, you may request a full refund within the period and requirements provided by applicable law.'],
      ['3. After use begins', 'Opening premium content or using a learning feature may be considered the start of digital-content delivery. Withdrawal may then be restricted, or the used portion may be deducted. The applicable amount will be explained based on usage history and law.'],
      ['4. Service defects', 'If a material defect or an issue attributable to Langbridge prevents normal use, access may be restored or extended, or a refund may be provided as required by law.'],
      ['5. Processing time', 'After approval, the payment provider may require several business days to complete the refund. Timing varies by payment method.'],
      ['6. No automatic renewal', 'The current 30-day and 12-month passes are one-time purchases. They do not renew automatically and no additional charge occurs when access expires.'],
    ],
    termsLink: 'View Terms of Use',
  },
};

export default async function RefundPolicyPage() {
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
      <Link href="/terms" className="mt-10 inline-flex text-sm font-semibold text-emerald-700 underline underline-offset-4 dark:text-emerald-300">
        {t.termsLink}
      </Link>
    </article>
  );
}
