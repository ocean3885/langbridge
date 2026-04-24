# Supabase CLI 사용 가이드

Supabase CLI를 사용하면 로컬 개발 환경과 원격 프로덕션 환경의 데이터베이스 스키마를 동기화하고, TypeScript 타입을 자동으로 생성하는 등 개발 생산성을 크게 높일 수 있습니다.

## 1. 설치

프로젝트 개발 의존성으로 설치하는 것을 권장합니다.

```bash
npm install supabase --save-dev
```

## 2. 초기 설정 및 로그인

### 로그인
Supabase 계정에 액세스하기 위해 로그인합니다. 브라우저 창이 열리면 승인하면 됩니다.

```bash
npx supabase login
```

### 프로젝트 초기화
프로젝트 루트에서 Supabase 설정을 초기화합니다. (이미 `supabase/migrations` 폴더를 생성했더라도 실행하면 `config.toml` 등을 추가로 생성합니다.)

```bash
npx supabase init
```

### 원격 프로젝트 연결
실제 Supabase 프로젝트와 로컬 환경을 연결합니다. `<project-id>`는 Supabase 대시보드 URL에서 확인할 수 있습니다 (예: `https://supabase.com/dashboard/project/abcde...` 에서 `abcde...`).

```bash
npx supabase link --project-ref <project-id>
```
*연결 시 데이터베이스 비밀번호가 필요합니다.*

## 3. 데이터베이스 마이그레이션 관리

### 현재 DB 상태 가져오기 (Pull)
이미 원격 DB에 테이블이 생성되어 있다면, 현재 상태를 migration 파일로 가져올 수 있습니다.

```bash
npx supabase db pull
```

### 새로운 변경 사항 작성
새로운 migration 파일을 생성합니다.

```bash
npx supabase migration new add_new_table
```
`supabase/migrations/` 폴더에 타임스탬프가 붙은 새 파일이 생성됩니다. 여기에 SQL을 작성하세요.

### 원격 DB에 반영 (Push)
로컬에 새로 작성한 migration 파일들을 원격 DB에 적용합니다.

```bash
npx supabase db push
```

## 4. TypeScript 타입 생성 (매우 유용!)

DB 스키마를 기반으로 TypeScript 인터페이스를 자동으로 생성합니다. 이를 통해 코드에서 자동 완성과 타입 체크 기능을 사용할 수 있습니다.

```bash
npx supabase gen types typescript --project-id <project-id> > lib/supabase/database.types.ts
```

생성된 타입은 다음과 같이 클라이언트 생성 시 사용할 수 있습니다:

```typescript
import { Database } from '@/lib/supabase/database.types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient<Database>(URL, KEY)
```

## 5. 로컬 개발 환경 (Docker 필요)

Docker가 설치되어 있다면, 로컬에서 전체 Supabase 환경을 띄워 테스트할 수 있습니다.

```bash
npx supabase start  # 로컬 서비스 시작
npx supabase stop   # 중지
npx supabase status # 상태 확인
```
