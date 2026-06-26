'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clipboard, Copy, Loader2, PenSquare, X } from 'lucide-react';
import { createBlogPostFromJsonAction } from '../actions';
import type { BlogPromptContext } from '@/lib/supabase/services/blog';

interface BlogPostCreateButtonProps {
  promptContext: BlogPromptContext;
}

function formatExistingCategories(categories: BlogPromptContext['categories']) {
  if (categories.length === 0) {
    return '* 없음';
  }

  return categories
    .map((category) => {
      const description = category.description ? ` - ${category.description}` : '';
      return `* ${category.slug}: ${category.name}${description}`;
    })
    .join('\n');
}

function formatExistingPosts(posts: BlogPromptContext['posts']) {
  if (posts.length === 0) {
    return '* 없음';
  }

  return posts.map((post) => `* ${post.slug} [${post.status}]: ${post.title}`).join('\n');
}

function buildBlogPostPrompt(promptContext: BlogPromptContext) {
  return `HolaLingo의 스페인어 학습 블로그 신규 글 JSON을 생성해줘.

역할:

* 너는 한국어 사용자를 대상으로 스페인어 학습 콘텐츠를 쓰는 SEO 블로그 에디터야.
* 글은 초보 학습자가 바로 실행할 수 있는 실용적인 내용이어야 해.
* 스페인어 예문과 문법 설명은 정확하고 자연스러워야 해.

기존 카테고리:

${formatExistingCategories(promptContext.categories)}

기존 게시물:

${formatExistingPosts(promptContext.posts)}

생성 조건:

* 한국어 독자를 위한 스페인어 학습 글을 작성
* SEO 검색 유입을 고려한 실용적인 제목과 설명 작성
* 기존 게시물과 slug, title, 주제가 겹치지 않게 새 글을 기획
* 기존 게시물과 같은 검색 의도라면 더 구체적인 하위 주제로 차별화
* 새 글 목적에 맞는 기존 카테고리가 있으면 반드시 기존 category.slug와 category.name을 그대로 사용
* 기존 카테고리로 분류하기 어려운 경우에만 새 category를 생성
* 비슷한 목적의 카테고리를 새로 만들지 말 것

필드 규칙:

* slug는 영문 소문자 kebab-case로 작성하고, 영문 소문자, 숫자, 하이픈만 사용
* canonicalUrl은 반드시 "/blog/{slug}" 형식
* status는 "published"
* imageUrl과 ogImageUrl은 나중에 운영자가 채울 예정이므로 빈 문자열로 둠
* title은 한국어 기준 공백 포함 22~45자 권장
* description은 블로그 카드와 상세 상단에 보이는 독자 친화 요약으로 작성
* seoTitle은 검색 결과에 자연스럽게 보이도록 25~55자 권장
* seoDescription은 검색 결과 노출을 고려한 메타 설명으로 작성
* description과 seoDescription은 의미가 비슷해도 표현을 다르게 작성
* description과 seoDescription은 각각 80~150자 권장
* tags는 4~8개
* category.slug와 tag.slug는 영문 소문자 kebab-case
* readingMinutes는 4~8 사이의 정수

본문 규칙:

* content.intro는 2~3문장
* content.sections는 4~5개 권장
* 각 section.heading은 구체적인 실행 팁이 드러나게 작성
* 각 section.body는 정확히 2개 문단 문자열 배열
* 각 문단은 2~4문장
* 본문은 얕은 개요가 아니라 실제 예문, 학습 순서, 주의할 점을 포함
* 스페인어 표현이나 예문을 사용할 때는 가능하면 바로 뒤에 한국어 뜻을 함께 제공
* 예문은 초보자가 실제로 따라 말할 수 있는 짧고 자연스러운 문장 위주로 작성
* 스페인어 예문에는 철자와 악센트를 정확히 사용
* 문법 설명은 초보자에게 이해하기 쉽게 단순화하되, 예외가 많은 경우에는 과도하게 일반화하지 말 것
* content.cta는 HolaLingo 학습 페이지로 자연스럽게 연결
* cta.href는 "/learn", "/bundles", "/learn/review/words" 중 하나 사용

출력 규칙:

* JSON 객체만 출력
* markdown 코드블록, 설명, 주석, trailing comma 금지
* 모든 key와 문자열은 double quote 사용
* 아래 스키마 외의 필드는 넣지 말 것

스키마:
{
    "slug": "spanish-example-post",
    "title": "스페인어 초보가 매일 익힐 기본 표현",
    "description": "스페인어 초보자가 매일 반복하기 좋은 기본 표현과 복습 순서를 실전 예시와 함께 정리했습니다.",
    "category": {
        "slug": "spanish-study",
        "name": "스페인어 공부법",
        "description": "스페인어 학습 루틴과 독학 전략을 다루는 글"
    },
    "tags": [
        { "slug": "spanish-beginner", "name": "스페인어 초보" },
        { "slug": "spanish-expression", "name": "스페인어 표현" }
    ],
    "imageUrl": "",
    "readingMinutes": 5,
    "status": "published",
    "seoTitle": "스페인어 초보 기본 표현과 매일 복습 루틴",
    "seoDescription": "스페인어 초보자가 바로 말할 수 있는 기본 표현과 오래 기억하는 복습 방법을 단계별로 안내합니다.",
    "ogImageUrl": "",
    "canonicalUrl": "/blog/spanish-example-post",
    "content": {
        "intro": "스페인어를 처음 시작하면 어떤 표현부터 익혀야 할지 막막할 수 있습니다. 매일 쓰는 짧은 표현부터 반복하면 발음과 문장 구조에 자연스럽게 익숙해집니다.",
        "sections": [
            {
                "heading": "인사 표현을 소리 내어 반복하기",
                "body": [
                    "Hola, gracias, mucho gusto처럼 짧고 자주 쓰는 표현부터 시작하세요. 뜻을 아는 것에서 멈추지 말고 실제 대화처럼 소리 내어 반복하는 것이 중요합니다.",
                    "처음에는 발음이 어색해도 같은 표현을 매일 3분씩 말하면 입이 먼저 기억하기 시작합니다. 짧은 표현은 학습 부담이 작아서 루틴을 만들기에도 좋습니다."
                ]
            }
        ],
        "cta": {
            "title": "오늘 배울 스페인어 표현을 바로 시작해 보세요",
            "body": "짧은 문장과 단어 묶음으로 부담 없이 스페인어 루틴을 만들 수 있습니다.",
            "href": "/learn",
            "label": "학습 시작하기"
        }
    }
}`;
}

export function BlogPostCreateButton({ promptContext }: BlogPostCreateButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const blogPostPrompt = useMemo(() => buildBlogPostPrompt(promptContext), [promptContext]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(blogPostPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('프롬프트를 클립보드에 복사하지 못했습니다.');
    }
  };

  const handleCreate = () => {
    setError(null);
    setMessage(null);

    if (!jsonText.trim()) {
      setError('생성할 JSON을 붙여넣어 주세요.');
      return;
    }

    startTransition(async () => {
      const result = await createBlogPostFromJsonAction(jsonText);

      if (!result.success) {
        setError(result.error ?? '블로그 글 생성에 실패했습니다.');
        return;
      }

      setJsonText('');
      setMessage('블로그 글이 생성되었습니다.');
      router.refresh();

      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
        if (result.slug) {
          router.push(`/blog/${result.slug}`);
        }
      }, 600);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setError(null);
          setMessage(null);
        }}
        className="inline-flex h-12 w-fit max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#559c63] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#468653] active:scale-95"
      >
        <PenSquare size={16} />
        글 작성
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-post-create-title"
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <h2 id="blog-post-create-title" className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
                  블로그 글 생성
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  LLM에서 만든 JSON으로 새 글을 발행합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">생성 프롬프트</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    복사 후 LLM에 붙여넣고 결과 JSON을 아래에 입력하세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied ? '복사됨' : '프롬프트 복사'}
                </button>
              </div>

              <label htmlFor="blog-post-json" className="mt-5 block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                블로그 JSON
              </label>
              <textarea
                id="blog-post-json"
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                spellCheck={false}
                className="mt-2 min-h-[360px] w-full resize-y rounded-lg border border-zinc-300 bg-white p-4 font-mono text-xs leading-6 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder='{"slug":"spanish-example-post","title":"...","description":"...","content":{"intro":"...","sections":[{"heading":"...","body":["..."]}]}}'
              />

              {error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </div>
              ) : null}

              {message ? (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 size={16} />
                  {message}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#559c63] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#468653] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Clipboard size={16} />}
                {isPending ? '생성 중' : '확인'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
