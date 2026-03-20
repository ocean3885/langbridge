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
- **Backend**: SQLite3 (앱 DB/인증/관리 데이터) + Supabase Storage (미디어 파일)
- **Styling**: Tailwind CSS, shadcn/ui
- **Video**: YouTube Player API

## 시작하기

### 환경 변수 설정

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SQLITE_DB_PATH=.data/langbridge.sqlite
SUPER_ADMIN_USER_IDS=comma,separated,user_ids
SUPER_ADMIN_EMAILS=comma,separated,emails@example.com
```

### DB 구성

- 미디어 업로드/파일 관리는 기존처럼 Supabase Storage 버킷 사용
- 사용자/콘텐츠/관리자 데이터는 SQLite 파일 DB 사용
- 운영자 권한은 SQLite `super_admin_users` 또는 환경변수(`SUPER_ADMIN_USER_IDS`, `SUPER_ADMIN_EMAILS`)로 관리
- SQLite DB 파일은 기본값으로 `.data/langbridge.sqlite`에 생성됨
- 현재 로그인 사용자 확인은 `GET /api/me`로 조회 가능 (Supabase 세션 + SQLite 세션 쿠키 통합)

### 초기 Super Admin 등록 방법

1. `.env.local`에 아래 중 하나(또는 둘 다)를 설정합니다.
	- `SUPER_ADMIN_USER_IDS`: 사용자 UUID를 콤마(,)로 구분
	- `SUPER_ADMIN_EMAILS`: 운영자 이메일을 콤마(,)로 구분
2. 해당 계정으로 로그인하면 `isSuperAdminSqlite` 체크 시 자동으로 SQLite `super_admin_users` 테이블에 upsert 됩니다.
3. 이후에는 환경변수를 제거해도, 등록된 계정은 `super_admin_users`에 남아 운영자 권한을 유지합니다.

예시:

```env
SUPER_ADMIN_USER_IDS=11111111-2222-3333-4444-555555555555
SUPER_ADMIN_EMAILS=admin@example.com,ops@example.com
```

### 클라이언트 사용자 상태 조회

- 공통 훅: `lib/hooks/use-current-user.ts`
- 사용 예시:

```tsx
"use client";
import { useCurrentUser } from '@/lib/hooks/use-current-user';

export default function Example() {
	const { user, authenticated, loading } = useCurrentUser();
	if (loading) return <div>Loading...</div>;
	if (!authenticated) return <div>로그인이 필요합니다.</div>;
	return <div>{user?.email}</div>;
}
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
- `auth_users`: 앱 로그인 계정
- `user_profiles`: 사용자 프로필
- `super_admin_users`: 운영자 계정

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
