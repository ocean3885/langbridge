# Supabase Migration System

이 폴더는 LangBridge 프로젝트의 데이터베이스 스키마 변경 사항을 관리합니다.
모든 SQL 변경 사항은 파일 형태로 기록되어, 데이터베이스의 변화를 추적하고 협업 시 동기화를 용이하게 합니다.

## migration 파일 명명 규칙

파일 이름은 다음과 같은 형식을 따릅니다:
`YYYYMMDDHHMMSS_description.sql`

- **YYYYMMDDHHMMSS**: 생성 날짜와 시간 (예: `20260424000000`)
- **description**: 변경 사항에 대한 간단한 설명 (예: `add_user_settings_table`)

## 새로운 변경 사항 적용 방법

1. **새 migration 파일 생성**: 
   `supabase/migrations/` 폴더 내에 새로운 timestamp가 붙은 `.sql` 파일을 생성합니다.
   
2. **SQL 작성**:
   추가하거나 수정할 테이블, 컬럼, 트리거 등의 SQL 문을 작성합니다.
   
3. **Supabase에 적용**:
   - **방법 A (추천)**: Supabase CLI를 설치한 경우 `supabase db push` 명령을 사용하여 적용합니다.
   - **방법 B (수동)**: 파일의 내용을 복사하여 Supabase Dashboard의 **SQL Editor**에서 직접 실행합니다.

## 주의 사항

- 이미 적용된 migration 파일은 **절대 수정하지 마세요**. 
- 만약 실수가 있었다면, 새로운 migration 파일을 만들어 수정 사항(ALTER, DROP 등)을 적용해야 합니다.
- 이를 통해 데이터베이스의 히스토리를 온전하게 유지할 수 있습니다.
