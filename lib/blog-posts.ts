export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  image: string;
  keywords: string[];
  intro: string;
  sections: {
    heading: string;
    body: string[];
  }[];
  cta: {
    title: string;
    body: string;
    href: string;
    label: string;
  };
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'spanish-beginner-study-roadmap',
    title: '스페인어 초보자를 위한 4주 학습 로드맵',
    description:
      '스페인어 입문자가 알파벳, 발음, 핵심 표현, 짧은 문장 만들기까지 자연스럽게 이어갈 수 있는 4주 학습 순서입니다.',
    category: '스페인어 공부법',
    publishedAt: '2026-06-26',
    readingMinutes: 5,
    image: '/images/heroimg_land.jpg',
    keywords: ['스페인어 초보', '스페인어 공부법', '스페인어 독학', '스페인어 입문'],
    intro:
      '스페인어를 처음 시작할 때 가장 어려운 부분은 무엇을 먼저 해야 하는지 정하는 일입니다. 문법책 첫 장부터 끝까지 밀어붙이기보다, 소리와 기본 표현을 먼저 익히고 짧은 문장을 매일 말해 보는 흐름이 훨씬 오래 갑니다.',
    sections: [
      {
        heading: '1주차: 소리와 인사 표현에 익숙해지기',
        body: [
          '첫 주에는 알파벳을 외우는 것보다 스페인어 소리에 귀를 여는 것이 중요합니다. hola, gracias, mucho gusto처럼 자주 쓰는 표현을 듣고 따라 말하면서 강세와 리듬을 익혀 보세요.',
          '하루 학습량은 15분이면 충분합니다. 짧게 들어도 매일 반복하면 스페인어가 낯선 소리에서 익숙한 패턴으로 바뀌기 시작합니다.',
        ],
      },
      {
        heading: '2주차: 자기소개 문장 만들기',
        body: [
          'Me llamo, soy, vivo en 같은 기본 구조를 사용하면 바로 자기소개 문장을 만들 수 있습니다. 단어를 많이 외우기보다 내 상황에 맞는 문장 5개를 먼저 만드는 것이 좋습니다.',
          '예문을 그대로 외운 뒤 이름, 직업, 나라, 취미만 바꾸면 말하기 연습의 부담이 크게 줄어듭니다.',
        ],
      },
      {
        heading: '3주차: 자주 쓰는 동사로 일상 말하기',
        body: [
          'querer, tener, ir, hacer처럼 자주 쓰는 동사부터 익히면 표현력이 빠르게 늘어납니다. 문법 설명을 오래 읽기보다 “나는 커피를 원해요”, “오늘 집에 가요”처럼 바로 쓰는 문장으로 연습하세요.',
          '동사는 완벽하게 외운 뒤 쓰는 것이 아니라, 자주 쓰면서 익숙해지는 쪽이 훨씬 현실적입니다.',
        ],
      },
      {
        heading: '4주차: 짧은 듣기와 복습 루틴 만들기',
        body: [
          '마지막 주에는 이미 배운 표현을 듣기, 말하기, 퀴즈로 섞어 복습합니다. 같은 표현을 여러 방식으로 만나야 실제 대화에서 떠올리기 쉬워집니다.',
          'HolaLingo처럼 짧은 레슨과 반복 훈련이 함께 있는 도구를 사용하면 초보 단계에서 가장 중요한 “매일 이어가기”를 만들기 좋습니다.',
        ],
      },
    ],
    cta: {
      title: '오늘 배울 스페인어 표현을 바로 시작해 보세요',
      body: '짧은 문장과 단어 묶음으로 부담 없이 스페인어 루틴을 만들 수 있습니다.',
      href: '/learn',
      label: '학습 시작하기',
    },
  },
  {
    slug: 'spanish-phrases-for-travel',
    title: '여행 전에 꼭 익힐 스페인어 회화 표현 20개',
    description:
      '스페인, 멕시코, 남미 여행에서 식당, 호텔, 길 찾기, 쇼핑 상황에 바로 쓸 수 있는 기초 스페인어 표현을 정리했습니다.',
    category: '여행 스페인어',
    publishedAt: '2026-06-26',
    readingMinutes: 4,
    image: '/images/main.png',
    keywords: ['여행 스페인어', '스페인어 회화', '스페인 여행 표현', '멕시코 여행 스페인어'],
    intro:
      '여행 스페인어는 문법을 많이 아는 것보다 상황별로 바로 꺼낼 수 있는 표현을 익히는 것이 핵심입니다. 인사, 주문, 요청, 길 묻기 표현만 알아도 여행의 긴장이 많이 줄어듭니다.',
    sections: [
      {
        heading: '식당에서 쓰는 표현',
        body: [
          'Una mesa para dos, por favor. 두 명 자리 부탁드립니다. La cuenta, por favor. 계산서 부탁드립니다. 같은 표현은 식당에서 거의 매번 쓸 수 있습니다.',
          '주문할 때는 Quiero 또는 Me gustaría를 사용하면 정중하고 자연스럽습니다. 메뉴 이름을 정확히 몰라도 señalando esto라고 말하며 가리키면 충분히 통합니다.',
        ],
      },
      {
        heading: '길을 물을 때 쓰는 표현',
        body: [
          'Dónde está el baño? 화장실이 어디인가요? Cómo llego a la estación? 역에 어떻게 가나요? 같은 표현은 여행 중 활용도가 높습니다.',
          '상대의 답변을 모두 이해하지 못해도 izquierda, derecha, cerca, lejos 같은 방향 단어를 알고 있으면 핵심 정보를 잡기 쉽습니다.',
        ],
      },
      {
        heading: '호텔과 쇼핑에서 쓰는 표현',
        body: [
          'Tengo una reserva. 예약했습니다. Cuánto cuesta? 얼마인가요? Puedo pagar con tarjeta? 카드로 결제할 수 있나요? 같은 표현은 입국 첫날부터 바로 쓸 수 있습니다.',
          '여행 표현은 긴 문장보다 짧고 정확한 표현을 많이 반복하는 편이 좋습니다. 발음까지 함께 익히면 현지에서 훨씬 자신 있게 말할 수 있습니다.',
        ],
      },
    ],
    cta: {
      title: '여행 표현을 퀴즈로 복습해 보세요',
      body: '단어와 문장을 반복해서 만나면 여행지에서 바로 떠올리기 쉬워집니다.',
      href: '/bundles',
      label: '번들 둘러보기',
    },
  },
  {
    slug: 'spanish-vocabulary-retention',
    title: '스페인어 단어를 오래 기억하는 복습 방법',
    description:
      '스페인어 단어 암기가 금방 흐려지는 이유와, 예문·간격 반복·능동 회상을 활용해 오래 기억하는 방법을 소개합니다.',
    category: '단어 암기',
    publishedAt: '2026-06-26',
    readingMinutes: 5,
    image: '/assets/characters/studyfull.webp',
    keywords: ['스페인어 단어', '스페인어 단어 암기', '스페인어 복습', '간격 반복'],
    intro:
      '단어장을 여러 번 봤는데 막상 문장을 만들 때 떠오르지 않는다면, 암기량이 부족해서가 아니라 복습 방식이 맞지 않을 가능성이 큽니다. 단어는 뜻만 보는 것보다 예문 안에서 다시 꺼내 쓰는 연습이 필요합니다.',
    sections: [
      {
        heading: '뜻 확인보다 능동 회상이 먼저입니다',
        body: [
          '단어와 뜻을 눈으로 반복해서 보는 방식은 익숙함을 만들지만, 실제 기억을 꺼내는 힘은 약할 수 있습니다. 한국어 뜻을 보고 스페인어 단어를 떠올리거나, 스페인어 단어로 짧은 문장을 만들어 보세요.',
          '처음에는 느리고 답답해도 이 과정이 기억을 더 단단하게 만듭니다.',
        ],
      },
      {
        heading: '예문 하나가 단어 여러 개보다 강합니다',
        body: [
          'comer를 “먹다”로만 외우는 것보다 Quiero comer algo. 같은 문장으로 익히면 사용 장면까지 함께 기억됩니다.',
          '단어를 외울 때는 품사, 뜻, 예문, 발음을 한 묶음으로 만나는 것이 좋습니다. 그래야 듣기와 말하기로 이어지기 쉽습니다.',
        ],
      },
      {
        heading: '잊기 전에 다시 만나야 합니다',
        body: [
          '복습은 한 번에 오래 하는 것보다 다음 날, 3일 뒤, 1주 뒤처럼 간격을 두고 반복하는 편이 효과적입니다. 완전히 잊기 직전에 다시 꺼내는 과정이 장기 기억을 돕습니다.',
          'HolaLingo의 리뷰 흐름처럼 틀린 단어와 헷갈리는 문장을 다시 만나는 구조를 활용하면 단어장이 실제 표현력으로 이어질 가능성이 높아집니다.',
        ],
      },
    ],
    cta: {
      title: '외운 단어를 다시 꺼내는 연습을 해보세요',
      body: '플래시카드, 퀴즈, 문장 복습으로 단어를 오래 기억하는 루틴을 만들 수 있습니다.',
      href: '/learn/review/words',
      label: '단어 복습하기',
    },
  },
];

export function getBlogPosts() {
  return [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null;
}
