# SQLite에서 Supabase로의 DB 전환 가이드

본 문서는 현재 사용 중인 SQLite 데이터베이스를 Supabase(PostgreSQL)로 전환하기 위한 흐름과 주요 과정을 정리한 가이드입니다. 데이터 마이그레이션 없이 구조(Schema)만 새로 생성하여 프로젝트를 시작하는 경우를 기준으로 작성되었습니다.

---

## 1. Supabase 프로젝트 준비

1.  **Supabase 계정 및 프로젝트 생성**: [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트를 생성합니다.
2.  **환경 변수 설정**: 프로젝트 설정의 API 섹션에서 다음 값을 확인하여 `.env.local`에 적용합니다.
    *   `NEXT_PUBLIC_SUPABASE_URL`: 프로젝트 API URL
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 클라이언트 사이드용 익명 키
    *   `DATABASE_URL`: 직접 연결을 위한 PostgreSQL 연결 문자열 (Prisma 등을 사용할 경우 필요)

---

## 2. 데이터베이스 스키마 변환 (SQLite → PostgreSQL)

SQLite와 PostgreSQL은 문법과 데이터 타입에 차이가 있습니다. `lib/sqlite/schema/*.sql.ts`에 정의된 SQL 문을 Postgres 규격에 맞춰 수정해야 합니다.

### 주요 타입 매핑
| SQLite | PostgreSQL | 비고 |
| :--- | :--- | :--- |
| `TEXT` | `TEXT` 또는 `VARCHAR` | |
| `INTEGER` | `INT` 또는 `BIGINT` | ID 값은 주로 `BIGINT` 권장 |
| `PRIMARY KEY AUTOINCREMENT` | `PRIMARY KEY GENERATED ALWAYS AS IDENTITY` | |
| `CURRENT_TIMESTAMP` | `NOW()` | |
| `TEXT` (날짜용) | `TIMESTAMPTZ` | 시간대 포함 날짜 타입 권장 |

### 예시: `auth_users` 테이블 변환
**SQLite:**
```sql
CREATE TABLE auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```
**PostgreSQL (Supabase):**
```sql
CREATE TABLE auth_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Supabase 테이블 생성 과정

1.  **SQL Editor 활용**: Supabase 대시보드 좌측의 'SQL Editor'를 클릭합니다.
2.  **변환된 SQL 실행**: 위에서 변환한 PostgreSQL 스키마를 붙여넣고 `Run`을 실행하여 테이블과 인덱스를 생성합니다.
3.  **Table Editor 확인**: 'Table Editor' 메뉴에서 생성된 테이블 구조가 정확한지 확인합니다.

---

## 4. 프로젝트 코드 리팩토링 흐름

SQLite 라이브러리(`better-sqlite3`) 대신 Supabase 클라이언트 라이브러리(`@supabase/supabase-js`)를 사용하도록 변경합니다.

### Step 1: 데이터 액세스 계층 수정
`lib/sqlite/` 폴더 내의 각 서비스 파일들을 수정하거나 `lib/supabase/services/` 등의 새로운 폴더로 로직을 이동합니다.

**변경 전 (SQLite):**
```typescript
const db = await getSqliteDb();
const user = await db.get('SELECT * FROM auth_users WHERE id = ?', [id]);
```

**변경 후 (Supabase):**
```typescript
import { createClient } from '@/lib/supabase/server'; // 또는 client

const supabase = await createClient();
const { data: user, error } = await supabase
  .from('auth_users')
  .select('*')
  .eq('id', id)
  .single();
```

### Step 2: 공통 DB 어댑터 교체
`lib/sqlite/db.ts` 대신 `lib/supabase/client.ts` 또는 `server.ts`를 사용하도록 진입점을 변경합니다.

---

## 5. 보안 설정 (Row Level Security)

Supabase는 기본적으로 모든 테이블에 대해 **RLS(Row Level Security)** 사용을 권장합니다.
1.  **RLS 활성화**: 각 테이블의 `Authentication` 메뉴에서 RLS를 활성화합니다.
2.  **Policy 설정**: 어떤 사용자가 데이터를 읽고 쓸 수 있는지 정책을 정의합니다. (예: `auth.uid() = user_id`)

---

## 6. 점검 리스트

- [ ] Supabase 프로젝트의 Region 설정 확인 (한국 리전 권장: `ap-northeast-2`)
- [ ] `.env.local`의 모든 Supabase 관련 환경 변수 입력 완료
- [ ] PostgreSQL 예약어와 충돌하는 컬럼명 확인 (예: `user`, `order` 등은 따옴표 필요)
- [ ] 데이터 생성/수정 시 `updated_at` 자동 업데이트를 위한 Postgres 트리거 설정 (선택 사항)

---
*참고: 데이터베이스 변경 사항은 `supabase/migrations/` 폴더에서 누적 관리됩니다. 새로운 테이블을 추가하거나 기존 구조를 변경할 때는 해당 폴더에 새로운 SQL 파일을 생성하여 관리하세요.*
