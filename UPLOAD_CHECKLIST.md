# 업로드 기능 점검 체크리스트

## ✅ 사전 준비사항

업로드 기능이 정상적으로 작동하려면 다음 항목들이 설정되어 있어야 합니다:

### 1. Supabase 데이터베이스 테이블

다음 테이블들이 생성되어 있어야 합니다:

```sql
-- 카테고리 테이블
CREATE TABLE lang_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 샘플 카테고리 추가
INSERT INTO lang_categories (name) VALUES 
  ('기초 회화'),
  ('여행'),
  ('비즈니스'),
  ('일상 대화');

-- 오디오 콘텐츠 테이블
CREATE TABLE audio_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  category_id INTEGER REFERENCES lang_categories(id),
  original_text TEXT,
  translated_text TEXT,
  sync_data JSONB NOT NULL,
  audio_file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 설정
ALTER TABLE audio_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own audio content"
  ON audio_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own audio content"
  ON audio_content FOR SELECT
  USING (auth.uid() = user_id);

-- lang_categories RLS 정책
ALTER TABLE lang_categories ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 카테고리 조회 가능
CREATE POLICY "Anyone can view categories"
  ON lang_categories FOR SELECT
  USING (true);

-- 인증된 사용자가 카테고리 추가 가능
CREATE POLICY "Authenticated users can insert categories"
  ON lang_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 인증된 사용자가 카테고리 수정 가능
CREATE POLICY "Authenticated users can update categories"
  ON lang_categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 인증된 사용자가 카테고리 삭제 가능
CREATE POLICY "Authenticated users can delete categories"
  ON lang_categories FOR DELETE
  TO authenticated
  USING (true);
```

### 2. Supabase Storage 버킷

```sql
-- Storage 버킷 생성 (Supabase Dashboard에서도 가능)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio_files', 'audio_files', true);

-- Storage 정책 설정
CREATE POLICY "Users can upload their own audio files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio_files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view audio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio_files');
```

### 3. 카테고리 권한 설정 확인

**현재 설정:** 인증된 모든 사용자가 카테고리를 추가/수정/삭제할 수 있습니다.

**더 엄격한 권한이 필요한 경우:**

#### 옵션 A: 특정 사용자만 허용 (관리자)

```sql
-- 관리자 테이블 생성
CREATE TABLE admins (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 관리자 추가
INSERT INTO admins (user_id) VALUES ('your-user-id-here');

-- 정책 수정: 관리자만 카테고리 수정 가능
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON lang_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON lang_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON lang_categories;

CREATE POLICY "Admins can insert categories"
  ON lang_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update categories"
  ON lang_categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can delete categories"
  ON lang_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );
```

#### 옵션 B: Edge Function으로 Service Role 사용

API 라우트에서 Service Role 키를 사용하려면:

```typescript
// lib/supabase/service.ts 생성
import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key 사용
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
```

`.env.local`에 추가:
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

⚠️ **주의:** Service Role Key는 모든 RLS를 우회하므로 매우 조심해서 사용하세요!

### 4. 환경 변수 설정

`.env.local` 파일에 다음 환경 변수를 추가하세요:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# (선택) 관리자 기능을 위한 Service Role Key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Cloud Text-to-Speech
# Google Cloud Console에서 서비스 계정 JSON 키를 생성 후 Base64로 인코딩
GOOGLE_CREDENTIALS_BASE64=your-base64-encoded-credentials
```

**Google TTS 인증 정보 생성 방법:**

1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. Text-to-Speech API 활성화
3. 서비스 계정 생성 및 JSON 키 다운로드
4. 다음 명령으로 Base64 인코딩:
   ```bash
   base64 -i your-credentials.json
   ```
5. 출력된 문자열을 `GOOGLE_CREDENTIALS_BASE64`에 저장

## 🧪 테스트 방법

### 1. 테스트 TXT 파일 준비

`test.txt` 파일을 생성하세요:

```
Hola
안녕하세요
¿Cómo estás?
어떻게 지내세요?
Muy bien, gracias
아주 좋아요, 감사합니다
```

### 2. 업로드 테스트

1. `/upload` 페이지로 이동
2. 제목 입력 (예: "스페인어 기초 회화")
3. 카테고리 선택 (선택사항)
4. 위에서 만든 `test.txt` 파일 업로드
5. "업로드 및 처리 시작" 버튼 클릭

### 3. 예상 동작

✅ **성공 시:**
- 로딩 인디케이터 표시
- 처리 완료 후 `/player/[id]` 페이지로 리다이렉트
- 오디오 플레이어와 자막이 표시됨

❌ **실패 시 가능한 원인:**
- 환경 변수 미설정 → "GOOGLE_CREDENTIALS_BASE64 환경 변수가 설정되지 않았습니다" 에러
- Storage 버킷 없음 → "Bucket not found" 에러
- 테이블 없음 → "relation does not exist" 에러
- TTS API 비활성화 → Google API 관련 에러

## 🔍 디버깅

문제가 발생하면:

1. 브라우저 개발자 도구 → Console 탭 확인
2. 터미널에서 Next.js 서버 로그 확인
3. Supabase Dashboard → Logs 확인

## 📝 체크리스트

- [ ] `lang_categories` 테이블 생성됨
- [ ] `audio_content` 테이블 생성됨
- [ ] `audio_files` Storage 버킷 생성됨
- [ ] RLS 정책 설정됨 (audio_content)
- [ ] RLS 정책 설정됨 (lang_categories)
- [ ] Storage 정책 설정됨
- [ ] `GOOGLE_CREDENTIALS_BASE64` 환경 변수 설정됨
- [ ] Google Text-to-Speech API 활성화됨
- [ ] 사용자 로그인 상태임
- [ ] 테스트 TXT 파일 준비됨
