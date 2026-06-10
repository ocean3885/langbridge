# 문제풀이 모드별 데이터베이스 저장 및 갱신 가이드

HolaLingo 학습 플랫폼에서 사용자가 **플래시카드**, **퀴즈(Quiz)**, **스크램블(Scramble)** 모드를 학습하고 풀었을 때 데이터베이스에 어떻게 정보가 입력되는지 정리한 가이드라인입니다.

---

## 1. 개요 (수정되는 테이블 목록)

사용자가 각 학습 모드를 진행하면 서버 API(`POST /api/bundle-progress` 및 `PATCH /api/bundle-progress`)를 거쳐 다음 **5가지 주요 테이블**에 정보가 분산 및 집계되어 기록됩니다.

| 테이블명 | 역할 | 주 키 (PK/Unique) |
| :--- | :--- | :--- |
| **`user_bundle_item_interactions`** | 특정 문장(번들 아이템)의 완료 여부 및 정오답 횟수 기록 | `(user_id, bundle_item_id)` |
| **`user_sentence_interactions`** | 개별 문장의 숙련도 레벨(0~5), 연속 정답 횟수(Streak) 관리 | `(user_id, sentence_id)` |
| **`user_bundle_interactions`** | 특정 번들 전체의 진행 상황 및 완료 상태 관리 | `(user_id, bundle_id)` |
| **`user_learning_stats`** | 사용자의 전체 별(Star) 개수 및 총 정오답 횟수 집계 | `user_id` |
| **`user_learning_daily_activity`** | 연속 학습(Streak) 계산을 위한 일일 활동 로그 기록 | `(user_id, activity_date)` |

---

## 2. 모드별 데이터 입력 및 업데이트 상세

### 🎴 Flashcard (플래시카드 학습 시)
플래시카드는 단순 조회/암기형 학습이므로 정/오답 기록이 필요 없으며, **진행 중인 위치 저장 및 일일 활동 로그**만 갱신됩니다.

*   **동작 시점**: 플래시카드 화면에 진입하거나 카드를 넘겨서 새로운 문장에 도달했을 때 (`PATCH /api/bundle-progress` 호출)
*   **테이블 및 컬럼 업데이트 내역**:

#### 1) `user_bundle_interactions`
*   `is_started` ➡️ `true` 로 변경.
*   `last_studied_at` ➡️ 현재 시간(`now()`)으로 갱신.
*   `current_practice_item_ids` (JSONB) ➡️ 플래시카드 모드에서 머무르고 있는 마지막 문장 ID를 업데이트합니다.
    ```json
    { "flashcards": "현재_진행중인_문장_UUID" }
    ```

#### 2) `user_learning_daily_activity`
*   `activity_count` ➡️ `1` 증가 (최초 활동인 경우 `1`로 등록).
*   `first_activity_at` ➡️ 당일 최초 활동 시각을 기록.
*   `last_activity_at` ➡️ 현재 시간(`now()`)으로 갱신.

---

### 📝 Quiz & Scramble (퀴즈 및 스크램블 풀이 시)
퀴즈와 스크램블은 정/오답 판단이 발생하는 풀이 학습입니다. 사용자가 **"옵션을 골랐을 때(Quiz)"** 또는 **"정답 확인을 눌렀을 때(Scramble)"** 업데이트가 수행됩니다. (`POST /api/bundle-progress` 호출)

*   **테이블 및 컬럼 업데이트 내역**:

#### 1) `user_bundle_item_interactions` (문장 단위 기록)
사용자가 푼 해당 문장의 기록이 업데이트됩니다.

| 컬럼명 | 정답 시 (`is_correct = true`) | 오답 시 (`is_correct = false`) |
| :--- | :--- | :--- |
| **`is_completed`** | `true`로 설정 (이후 오답을 제출해도 계속 `true` 유지) | 변경 없음 (이전 상태 유지) |
| **`correct_count`** | 기존 값 + `1` | 변경 없음 |
| **`incorrect_count`** | 변경 없음 | 기존 값 + `1` |
| **`last_practiced_at`** | 현재 시각 (`now()`) | 현재 시각 (`now()`) |
| **`completed_at`** | 최초로 맞췄을 때 현재 시각 (`now()`) 기록 | 변경 없음 |
| **`metadata` (JSONB)** | 아래 세부 JSON 스키마 참고하여 풀이 히스토리 저장 | 아래 세부 JSON 스키마 참고하여 풀이 히스토리 저장 |

> 💡 **`metadata` JSON 내부 구조**:
> 각 모드별로 상세 정오답 이력이 누적됩니다.
> ```json
> {
>   "last_practice_mode": "quiz",
>   "last_practice_is_correct": true,
>   "practice_modes": {
>     "quiz": {
>       "correct_count": 1,
>       "incorrect_count": 0,
>       "last_is_correct": true,
>       "last_practiced_at": "2026-06-10T13:53:19Z",
>       "first_correct_at": "2026-06-10T13:53:19Z",
>       "last_correct_at": "2026-06-10T13:53:19Z"
>     }
>   }
> }
> ```

---

#### 2) `user_sentence_interactions` (문장 레벨의 개별 학습 및 숙련도 기록)
번들 아이템에 매핑된 실제 문장(`sentence_id`)에 대한 전체 모드 통합 학습 통계 및 숙련도가 기록됩니다.

| 컬럼명 | 정답 시 (`is_correct = true`) | 오답 시 (`is_correct = false`) |
| :--- | :--- | :--- |
| **`correct_count`** | 기존 값 + `1` | 변경 없음 |
| **`incorrect_count`** | 변경 없음 | 기존 값 + `1` |
| **`streak_count`** | 기존 값 + `1` (연속 정답 카운트) | `0` (연속 정답 초기화) |
| **`proficiency_level`** | `Math.max(기존 레벨, 계산된 레벨)`<br>※ 아래의 연속 정답에 따른 숙련도 판정 기준 적용 | `Math.max(0, 기존 레벨 - 1)` (기존 레벨에서 1 감소) |
| **`last_reviewed_at`** | 현재 시각 (`now()`) | 현재 시각 (`now()`) |
| **`metadata` (JSONB)** | 정오답 상세 모드 정보 갱신 | 정오답 상세 모드 정보 갱신 |

> 💡 **연속 정답(`streak_count`)에 따른 숙련도(`proficiency_level`) 판정 기준**:
> *   **Level 0 (Unlearned / 미학습)**: `streak_count = 0` (오답 제출로 리셋된 경우를 포함)
> *   **Level 1 (Recognized / 인지)**: `streak_count >= 1`
> *   **Level 2 (Short-term / 단기기억)**: `streak_count >= 3`
> *   **Level 3 (Medium-term / 중기기억)**: `streak_count >= 6`
> *   **Level 4 (Long-term / 장기기억)**: `streak_count >= 10`
> *   **Level 5 (Mastered / 마스터)**: `streak_count >= 15`

---

#### 3) `user_bundle_interactions` (번들 단위 기록)
해당 문장이 속한 번들의 진행률과 최종 완료를 결정합니다.

*   **`is_started`**: `true`
*   **`current_practice_item_ids` (JSONB)**: 해당 모드(`quiz` 또는 `scramble`)에서 풀이한 최신 문장 ID를 업데이트하여 위치를 보관합니다.
    ```json
    {
      "quiz": "마지막_푼_문장_UUID",
      "scramble": "마지막_푼_문장_UUID"
    }
    ```
*   **`progress_ratio`**: 해당 번들 내부의 전체 문장 수 중 `user_bundle_item_interactions.is_completed = true`인 문장의 비율을 다시 계산하여 갱신합니다. (최대 `1.0`)
*   **`is_completed`**: 전체 문장을 모두 맞추는 시점(`progress_ratio = 1.0`)에 `true`로 설정됩니다.
*   **`completed_at`**: 번들 전체를 처음으로 다 맞췄을 때 현재 시각(`now()`)을 기록합니다.
*   **`last_studied_at` / `updated_at`**: 현재 시각(`now()`)으로 갱신.

---

#### 4) `user_learning_stats` (전체/누적 대시보드 통계)
사용자의 총 누적 데이터 집계용 테이블입니다. (`increment_user_learning_stats` 함수로 원자적 안전 처리)

*   **`completed_sentences`**: 이번 문제풀이로 인해 해당 문장의 `is_completed`가 최초로 `true`가 된 경우에만 `1` 증가 (이후 반복 정답 시 증가하지 않음).
*   **`earned_stars`**: 정답을 맞춰서 해당 모드(Quiz/Scramble)의 별을 최초로 획득하는 조건일 때 획득 보상 지급.
    *   *보상 기준*: Quiz 완료 시 `+2` 별 / Scramble 완료 시 `+3` 별.
    *   *조건*: 이전에 해당 모드에서 한 번이라도 맞춘 적이 없다면 별을 새로 획득합니다.
*   **`total_correct_count`**: 사용자가 문제를 맞출 때마다 무조건 `1` 증가.
*   **`total_incorrect_count`**: 사용자가 문제를 틀릴 때마다 무조건 `1` 증가.
*   **`updated_at`**: 현재 시각(`now()`)으로 갱신.

---

#### 5) `user_learning_daily_activity` (스트릭 및 출석부 데이터)
*   **`activity_count`**: 문제 풀이 1회 완료될 때마다 `1` 증가.
*   **`last_activity_at`**: 현재 시각(`now()`)으로 갱신.
*   **`metadata`**: 학습 로그 유형(`practice_result`), 푼 번들 ID, 문장 ID, 학습 모드(`quiz` 또는 `scramble`), 정답 여부(`isCorrect`)를 내부 JSON 로그로 추가 보관합니다.
