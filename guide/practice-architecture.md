# Practice 확장 가이드

## 정책과 코드 위치

- `lib/practice/registry.ts`: 모드 ID, 문장/단어 구분, 제공 위치, 결과 방식, 성취 정책, 출제 조건, 연결 단어 선택.
- `lib/practice/progress.ts`: 영구 Stars, 최근 정오답 상태, 모드별·번들별 별 집계.
- `app/bundles/[id]/practice-session.ts`: 위 정책에 기반한 세션 필터와 선택 화면 집계.
- `lib/supabase/services/bundle-progress.ts`: 대상 검증, 기록 저장, 숙련도와 전체 통계 반영.

모드 ID는 기록의 키이므로 배포 후 이름을 바꾸지 않는다. 기존 번들 모드 ID(`quiz`, `scramble`, `wordfill`, `spelling`, `flashcards`)를 사용하며, 단어 퀴즈와 단어 카드는 `word_quiz`, `word_flashcards`로 구분하며 번들 연습과 독립 단어 복습에서 같은 숙련도를 공유한다.

## 새로운 모드 추가

1. `PRACTICE_REGISTRY`에 모드를 등록한다.
   - `target`: `sentence` 또는 `word`.
   - `availableIn`: `bundle`, `review`, `both`. 복습 전용 모드는 번들 링크에 노출하지 않는다.
   - `result`: `correctness`는 정오답 저장, `completion`은 현재 접근/이어하기만 기록하는 비채점 모드용이다.
   - 문장 별 지급 모드: `achievement: 'stars'`, `stars: 1`.
   - 단어 숙련도 모드: `achievement: 'proficiency'`, `stars: 0`.
   - `isEligible`: 실제 문제로 구성할 수 있는 대상인지 판정한다.
   - 단어 모드의 `getWords`: 해당 번들 아이템에서 연습 가능한 단어를 반환한다.
   - 문장 활동이 단어 숙련도도 올리면 `updatesRelatedWord: true`와 `getWords`를 명시한다.
2. 페이지에서 문장은 `getEligiblePracticeItems`, 단어는 `getPracticeWordTargets`로 전체 후보를 만든다. 세션 필터, 무작위 선택, 개수 제한은 그 이후에 적용한다.
3. 문제 구성과 학습 UI를 구현하고 기존 API에 결과를 보낸다.
4. 모드 고유의 출제 조건과 결과 동작을 테스트한다.

기존 정오답/숙련도 정책을 재사용하면 API 허용 목록, 저장 테이블 컬럼, 별 집계 함수를 수정할 필요가 없다. 점수·발음 평가처럼 새로운 결과 형식은 별도의 공통 계약/정책 확장이 필요하다.

## 저장 계약

번들 결과는 `POST /api/bundle-progress`:

```json
{
  "bundle_id": "bundle UUID",
  "bundle_item_id": "bundle item UUID",
  "practice_mode": "spelling",
  "word_id": 123,
  "is_correct": true
}
```

- 문장 결과: 사용자 + 번들 문장 아이템의 `metadata.practice_modes[mode]`에 저장한다.
- 단어 결과: 사용자 + 단어의 `metadata.practice_modes[mode]`에 저장한다. 단어 숙련도는 번들 사이에 공유한다.
- 단어 모드 또는 `updatesRelatedWord` 모드는 연결된 유효한 `word_id`가 필수다. 서버가 번들 연결과 출제 가능 여부를 검사한다.
- Word Fill은 문장 별과 단어 숙련도를 함께 반영하지만 전체 정답/오답 횟수는 한 번만 센다.
- 독립 단어 결과는 `POST /api/word-progress`에 `word_id`, `practice_mode`, `is_correct`를 보낸다. 등록된 단어 모드만 허용한다.

이어하기는 `PATCH /api/bundle-progress`의 `current_bundle_item_id`, `current_practice_mode`를 사용한다. 단어 모드는 `current_word_id`도 필수다. 저장되는 `current_practice_item_ids[mode]`는 문장 모드에서는 번들 아이템 UUID, 단어 모드에서는 단어 ID의 문자열이다. 세션의 `progressId`도 같은 값을 사용한다.

## 성취와 최근 상태

- 문장 Stars: `correct_count > 0` 또는 `first_correct_at`이 있으면 지급된 별을 유지한다. 최근 오답도 별을 회수하지 않는다.
- 세션 정답/오답 필터: 해당 모드의 `last_is_correct`를 사용한다. 다른 모드의 결과로 미학습 상태를 추정하지 않는다.
- 최대 Stars: 현재 출제 가능한 문장·모드 조합을 합산한다. 콘텐츠나 모드를 추가하면 최대 개수는 늘어난다.
- 학습한 문장: 문장 모드에서 한 번 이상 정답을 맞힌 번들 문장 아이템 수. 모든 별 수집과는 다른 지표다.
- 단어는 기존 `proficiency_level` 정책을 사용한다. 새로운 배지나 장기 기억 판정은 이번 범위에 포함하지 않는다.

## 검증

```sh
npm run test:practice
npx tsc --noEmit
```

테스트는 실제 서비스 코드를 메모리 DB 대역으로 실행하여 저장 대상 분리, 별 유지, 단어 간 상태 독립, 연결 검증, 통계 중복 방지 및 재계산 일치를 확인한다. 실제 Supabase 통합 테스트를 대체하지 않는다.

현재 스키마의 JSON metadata와 기존 테이블을 재사용하므로 DB 마이그레이션은 필요 없다. 개발용 이전 기록을 새 정책에 맞춰 자동 변환하거나 삭제하지 않는다.

## 번들 단어 퀴즈와 카드

- `/bundles/[id]/word-quiz`, `/bundles/[id]/word-flashcards`는 `_components/BundleWordPracticePage.tsx`에서 접근 권한, 단어 중복 제거, 모드별 문제 선택과 이어하기를 처리한다.
- `components/practice/WordPracticeClient.tsx`는 번들 연습과 독립 복습이 공유하는 UI다. 번들에서는 모드를 고정하고 선택된 문제로 바로 시작한다.
- 번들 결과는 `/api/bundle-progress`, 독립 복습 결과는 `/api/word-progress`로 저장한다. 비로그인 번들 연습은 결과와 위치를 저장하지 않는다.
- 두 모드는 단어 숙련도에만 반영하며 문장 완료나 Stars를 지급하지 않는다. 이어하기 위치는 문제 수 제한 전에 적용한다.
