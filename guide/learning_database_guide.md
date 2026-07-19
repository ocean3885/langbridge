# 문제풀이 모드별 데이터베이스 저장 및 갱신 가이드

HolaLingo 학습 플랫폼에서 사용자가 **플래시카드(Flashcards)**, **퀴즈(Quiz)**, **스크램블(Scramble)**, **단어 채우기(Wordfill)**, **스펠링(Spelling)** 모드를 학습하고 풀었을 때 데이터베이스에 어떻게 정보가 입력되는지 정리한 가이드입니다.

현재 구현 기준 주요 진입점은 다음과 같습니다.

| API | 역할 |
| :--- | :--- |
| `PATCH /api/bundle-progress` | 번들/모드별 현재 위치 저장, 핀 상태 변경 |
| `POST /api/bundle-progress` | 정오답이 있는 문제풀이 결과 저장 |

---

## 1. 개요 (수정되는 테이블 목록)

사용자가 학습 모드를 진행하면 서버 API를 거쳐 다음 테이블에 정보가 분산 및 집계되어 기록됩니다.

| 테이블명 | 역할 | 주 키 (PK/Unique) |
| :--- | :--- | :--- |
| **`user_bundle_item_interactions`** | 특정 번들 아이템의 완료 여부 및 정오답 횟수 기록 | `(user_id, bundle_item_id)` |
| **`user_sentence_interactions`** | 개별 문장의 숙련도 레벨(0~5), 연속 정답 횟수 관리 | `(user_id, sentence_id)` |
| **`user_word_interactions`** | 개별 단어의 숙련도 레벨(0~5), 연속 정답 횟수 관리 | `(user_id, word_id)` |
| **`user_bundle_interactions`** | 특정 번들 전체의 진행 상황, 마지막 위치, 완료 상태 관리 | `(user_id, bundle_id)` |
| **`user_learning_stats`** | 사용자의 전체 별 개수, 완료 문장 수, 단어 학습 수, 총 정오답 횟수 집계 | `user_id` |
| **`user_learning_daily_activity`** | 연속 학습 및 일일 목표 계산을 위한 일일 활동 기록 | `(user_id, activity_date)` |

---

## 2. Flashcards / 위치 저장형 학습

플래시카드처럼 정오답 판단이 없는 학습은 풀이 통계를 만들지 않고, **현재 위치와 일일 활동**을 저장합니다.

*   **동작 시점**: 화면에 진입하거나 새로운 번들 아이템에 도달했을 때
*   **API**: `PATCH /api/bundle-progress`
*   **요청 핵심 값**: `bundle_id`, `current_bundle_item_id`

### 1) `user_bundle_interactions`

*   `is_started` -> `true`
*   `started_at` -> 기존 값이 없으면 현재 시각
*   `current_bundle_item_id` -> 마지막으로 본 번들 아이템 ID
*   `last_studied_at` / `updated_at` -> 현재 시각

### 2) `user_learning_daily_activity`

*   `activity_count` -> `1` 증가
*   `first_activity_at` -> 당일 최초 활동 시각
*   `last_activity_at` -> 현재 시각
*   `metadata.last_activity_type` -> `bundle_study`
*   `metadata.last_bundle_id`, `metadata.last_bundle_item_id` -> 마지막 학습 위치
*   `metadata.time_zone` -> 기본 `Asia/Seoul`

---

## 3. 모드별 위치 저장

퀴즈, 스크램블, 단어 채우기, 스펠링 등 모드별 현재 위치만 저장할 때도 `PATCH /api/bundle-progress`를 사용합니다.

*   **동작 시점**: 특정 practice mode 화면에서 현재 아이템 위치를 저장할 때
*   **API**: `PATCH /api/bundle-progress`
*   **요청 핵심 값**: `bundle_id`, `current_bundle_item_id`, `current_practice_mode`

### 1) `user_bundle_interactions`

*   `is_started` -> `true`
*   `started_at` -> 기존 값이 없으면 현재 시각
*   `current_practice_item_ids` -> practice mode별 마지막 번들 아이템 ID 저장
*   `last_studied_at` / `updated_at` -> 현재 시각

예시:

```json
{
  "flashcards": "마지막_학습한_번들아이템_UUID",
  "quiz": "마지막_푼_번들아이템_UUID",
  "scramble": "마지막_푼_번들아이템_UUID",
  "wordfill": "마지막_푼_번들아이템_UUID",
  "spelling": "마지막_푼_번들아이템_UUID"
}
```

> `current_practice_mode`은 소문자로 시작하고 영문 소문자, 숫자, `_`, `-`를 포함할 수 있는 문자열이면 허용됩니다. 다만 정오답 저장용 `POST`에서는 현재 `quiz`, `scramble`, `wordfill`, `spelling`만 허용됩니다.

---

## 4. 정오답 풀이 저장

정오답 판단이 있는 모드는 `POST /api/bundle-progress`로 결과를 저장합니다.

*   **대상 모드**: `quiz`, `scramble`, `wordfill`, `spelling`
*   **API**: `POST /api/bundle-progress`
*   **요청 핵심 값**: `bundle_id`, `bundle_item_id`, `practice_mode`, `is_correct`
*   **선택 값**: `word_id`

### 1) `user_bundle_item_interactions` (번들 아이템 단위 기록)

사용자가 푼 해당 번들 아이템의 기록이 업데이트됩니다.

| 컬럼명 | 정답 시 (`is_correct = true`) | 오답 시 (`is_correct = false`) |
| :--- | :--- | :--- |
| **`is_completed`** | `true`로 설정. 이후 오답을 제출해도 완료 상태 유지 | 기존 상태 유지 |
| **`correct_count`** | 기존 값 + `1` | 변경 없음 |
| **`incorrect_count`** | 변경 없음 | 기존 값 + `1` |
| **`last_practiced_at`** | 현재 시각 | 현재 시각 |
| **`completed_at`** | 최초 완료 시 현재 시각 기록 | 기존 상태 유지 |
| **`metadata`** | 모드별 정오답 이력 갱신 | 모드별 정오답 이력 갱신 |

`metadata` 예시:

```json
{
  "last_practice_mode": "quiz",
  "last_practice_is_correct": true,
  "practice_modes": {
    "quiz": {
      "correct_count": 1,
      "incorrect_count": 0,
      "last_is_correct": true,
      "last_practiced_at": "2026-06-10T13:53:19.000Z",
      "first_correct_at": "2026-06-10T13:53:19.000Z",
      "last_correct_at": "2026-06-10T13:53:19.000Z"
    }
  }
}
```

### 2) `user_sentence_interactions` (문장 단위 숙련도)

번들 아이템에 `sentence_id`가 있고 practice mode가 `spelling`이 아닌 경우, 해당 문장의 통합 학습 통계와 숙련도가 기록됩니다.

| 컬럼명 | 정답 시 (`is_correct = true`) | 오답 시 (`is_correct = false`) |
| :--- | :--- | :--- |
| **`correct_count`** | 기존 값 + `1` | 변경 없음 |
| **`incorrect_count`** | 변경 없음 | 기존 값 + `1` |
| **`streak_count`** | 기존 값 + `1` | `0` |
| **`proficiency_level`** | `Math.max(기존 레벨, 계산된 레벨)` | 기존 레벨이 1 이상이면 `Math.max(1, 기존 레벨 - 1)`, 기존 레벨이 0이면 `0` |
| **`last_reviewed_at`** | 현재 시각 | 현재 시각 |
| **`metadata`** | 모드별 정오답 이력 갱신 | 모드별 정오답 이력 갱신 |

연속 정답(`streak_count`)에 따른 숙련도(`proficiency_level`) 판정 기준:

| 레벨 | 기준 |
| :--- | :--- |
| Level 0 | `streak_count = 0` |
| Level 1 | `streak_count >= 1` |
| Level 2 | `streak_count >= 3` |
| Level 3 | `streak_count >= 6` |
| Level 4 | `streak_count >= 10` |
| Level 5 | `streak_count >= 15` |

> `spelling` 모드는 번들 아이템 완료/통계에는 반영되지만, 현재 구현에서는 `user_sentence_interactions`를 업데이트하지 않습니다.

### 3) `user_word_interactions` (단어 단위 숙련도)

요청에 `word_id`가 포함된 경우에만 단어 학습 기록이 업데이트됩니다. 주로 단어 중심 풀이 또는 복습 흐름에서 사용됩니다.

| 컬럼명 | 정답 시 (`is_correct = true`) | 오답 시 (`is_correct = false`) |
| :--- | :--- | :--- |
| **`correct_count`** | 기존 값 + `1` | 변경 없음 |
| **`incorrect_count`** | 변경 없음 | 기존 값 + `1` |
| **`streak_count`** | 기존 값 + `1` | `0` |
| **`proficiency_level`** | `Math.max(기존 레벨, 계산된 레벨)` | 기존 레벨이 1 이상이면 `Math.max(1, 기존 레벨 - 1)`, 기존 레벨이 0이면 `0` |
| **`last_reviewed_at`** | 현재 시각 | 현재 시각 |
| **`metadata`** | 모드별 정오답 이력 갱신 | 모드별 정오답 이력 갱신 |

### 4) `user_bundle_interactions` (번들 단위 진행률)

해당 번들이 얼마나 완료되었는지 다시 계산하고 마지막 풀이 위치를 저장합니다.

*   `is_started` -> `true`
*   `current_practice_item_ids[practice_mode]` -> 마지막으로 푼 번들 아이템 ID
*   `progress_ratio` -> 전체 번들 아이템 수 중 `user_bundle_item_interactions.is_completed = true`인 항목 비율
*   `is_completed` -> 전체 아이템이 완료되면 `true`
*   `started_at` -> 기존 값이 없으면 현재 시각
*   `completed_at` -> 번들을 처음 완료한 시각
*   `last_studied_at` / `updated_at` -> 현재 시각

### 5) `user_learning_stats` (전체/누적 대시보드 통계)

사용자의 누적 통계는 `increment_user_learning_stats` RPC로 원자적으로 증가합니다. 기존 통계 row가 없으면 기존 interaction 기반으로 baseline을 먼저 생성한 뒤 증가합니다.

*   `completed_sentences` -> 이번 정답으로 번들 아이템이 최초 완료된 경우 `1` 증가
*   `earned_stars` -> 해당 mode에서 처음 정답을 맞춘 경우 `1` 증가
*   `practiced_words` -> 단어 복습/단어 중심 흐름에서 새 단어 학습이 처음 기록된 경우 증가
*   `total_correct_count` -> 정답마다 `1` 증가
*   `total_incorrect_count` -> 오답마다 `1` 증가
*   `updated_at` -> 현재 시각

현재 번들 문제풀이 별 보상 기준:

| 모드 | 최초 정답 시 별 |
| :--- | :--- |
| `quiz` | `+1` |
| `scramble` | `+1` |
| `wordfill` | `+1` |
| `spelling` | `+1` |

### 6) `user_learning_daily_activity` (스트릭 및 일일 목표 데이터)

문제풀이 결과가 저장되면 일일 활동도 함께 기록됩니다.

*   `activity_date` -> 기본 `Asia/Seoul` 기준 날짜
*   `activity_count` -> 활동 1회마다 `1` 증가
*   `first_activity_at` -> 해당 날짜의 최초 활동 시각
*   `last_activity_at` -> 해당 날짜의 마지막 활동 시각
*   `metadata.activity_types` -> 활동 유형별 카운트 누적
*   `metadata.last_activity_type` -> 보통 `practice_result`
*   `metadata.last_bundle_id` -> 마지막 활동 번들 ID
*   `metadata.last_bundle_item_id` -> 마지막 활동 번들 아이템 ID
*   `metadata.last_practice_mode` -> 마지막 practice mode
*   `metadata.last_is_correct` -> 마지막 정오답 여부
*   `metadata.time_zone` -> 기본 `Asia/Seoul`

> 현재 metadata는 개별 풀이 로그 배열을 계속 append하는 구조가 아니라, 활동 유형별 카운트와 마지막 활동 정보를 보관하는 구조입니다.

---

## 5. 핀 상태 변경

`PATCH /api/bundle-progress`에 `is_pinned`를 전달하면 번들 핀 상태를 변경합니다.

### `user_bundle_interactions`

*   `is_pinned` -> 요청 값으로 변경
*   `updated_at` -> 현재 시각

---

## 6. 구현 기준 파일

현재 문서는 아래 구현을 기준으로 합니다.

| 파일 | 역할 |
| :--- | :--- |
| `app/api/bundle-progress/route.ts` | API 요청 검증 및 서비스 호출 |
| `lib/supabase/services/bundle-progress.ts` | 번들/아이템/문장/단어/누적 통계 저장 |
| `lib/supabase/services/learning-daily-activity.ts` | 일일 활동 및 streak 계산용 데이터 저장 |
| `supabase/migrations/20260529143000_add_user_learning_interactions.sql` | 번들/아이템/단어 interaction 테이블 생성 |
| `supabase/migrations/20260508171300_add_user_sentence_interactions.sql` | 문장 interaction 테이블 생성 |
| `supabase/migrations/20260605150000_add_user_learning_stats.sql` | 누적 통계 테이블 및 increment RPC 생성 |
| `supabase/migrations/20260605130000_add_user_learning_daily_activity.sql` | 일일 활동 테이블 생성 |
