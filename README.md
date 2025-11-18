# LangBridge

YouTube 동영상을 활용한 언어 학습 플랫폼

## 주요 기능

### 사용자 기능
- **영상 학습**: YouTube 영상과 스크립트를 동시에 보며 학습
- **이중 자막**: 원문과 번역문을 함께 표시
- **개인 노트**: 학습 중 메모 작성 및 관리
- **언어별/채널별 탐색**: 체계적인 콘텐츠 분류

### 관리자 기능
- **채널 관리**: YouTube 채널 등록 및 편집
- **영상 등록**: 스크립트와 번역 일괄 업로드
- **스크립트 편집**: 타임라인 정밀 조정 (Forward/Backward Fit)
- **언어 관리**: 다국어 학습 콘텐츠 지원

## 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Styling**: Tailwind CSS, shadcn/ui
- **Video**: YouTube Player API

## 시작하기

### 환경 변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

http://localhost:3000 접속

## 데이터베이스 스키마

### 주요 테이블
- `videos`: 영상 정보 (YouTube ID, 제목, 썸네일, 채널, 언어)
- `video_channels`: 채널 정보 (이름, URL, 썸네일, 언어)
- `transcripts`: 스크립트 (타임스탬프, 원문)
- `translations`: 번역 (다국어 지원)
- `user_notes`: 사용자 메모
- `languages`: 지원 언어 목록
- `lang_profiles`: 사용자 프로필 (관리자 권한)

## 프로젝트 구조

```
app/
├── admin/              # 관리자 페이지
│   ├── channels/       # 채널 관리
│   ├── videos/         # 영상 관리
│   └── languages/      # 언어 관리
├── videos/             # 사용자 영상 목록
├── player/             # 영상 플레이어
└── auth/               # 인증 페이지

components/             # 재사용 컴포넌트
lib/
├── supabase/          # Supabase 클라이언트
└── utils/             # 유틸리티 함수
```

## 라이선스

MIT
