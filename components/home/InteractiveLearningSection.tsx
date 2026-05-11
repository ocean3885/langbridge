"use client";

import {
    CheckCircle2,
    Repeat,
    BarChart3,
    Trophy,
    MoveHorizontal,
    PencilLine,
    Layers3,
} from "lucide-react";

interface InteractiveLearningSectionProps {
    lang?: "ko" | "en";
}

const translations = {
    ko: {
        badge: "Interactive Learning",
        title: (
            <>
                다양한 문제 유형으로
                <br />
                정말 이해했는지{" "}
                <span className="text-[#6C9B6E]">확인하며 학습해요</span>
            </>
        ),
        description: (
            <>
                읽고 넘어가는 것이 아니라, 직접 풀고 맞히며
                <br className="hidden sm:block" />
                스페인어를 내 것으로 만듭니다.
            </>
        ),
        card1: {
            title: "문장 단어 배열 Quiz",
            desc: "단어를 올바른 순서로 배열하며 문장 구조를 자연스럽게 익혀요.",
        },
        card2: {
            title: "문장 빈칸 채우기",
            desc: "문맥을 이해하고 빈칸을 채우며 실력을 탄탄하게 다져요.",
        },
        card3: {
            title: "Word Flash Card",
            desc: "단어를 반복해서 보고 익히며 오래 기억할 수 있도록 도와줘요.",
        },
        features: [
            {
                title: "정확한 실력 체크",
                desc: "다양한 문제를 통해 이해도를 정확히 확인해요.",
            },
            {
                title: "반복 학습 강화",
                desc: "틀린 문제는 다시 학습하며 자연스럽게 익혀요.",
            },
            {
                title: "학습 기록 분석",
                desc: "나의 학습 데이터를 기반으로 성장 흐름을 확인해요.",
            },
            {
                title: "성취감과 동기부여",
                desc: "단계별 학습으로 꾸준한 습관을 만들어요.",
            },
        ],
        previews: {
            quizPrompt: "저는 아침에 회의가 있어요.",
            quizInstruction: "단어를 터치하여 문장을 완성하세요",
            blankFeedback: "✓ 정답이에요! café",
            blankTip: "Tip: Tomar는 '마시다'라는 뜻으로도 자주 쓰여요.",
            flashHint: "카드를 눌러 뒤집어 보세요",
            flashMeaning: "여행",
            flashExample: "¡Buen viaje! (즐거운 여행 되세요!)",
            flashKnow: "알아요",
            flashUnknown: "몰라요",
        },
    },
    en: {
        badge: "Interactive Learning",
        title: (
            <>
                Master Spanish with
                <br />
                <span className="text-[#6C9B6E]">Interactive Exercises</span>
            </>
        ),
        description: (
            <>
                Don't just read—actively solve puzzles and complete
                <br className="hidden sm:block" />
                sentences to truly own the language.
            </>
        ),
        card1: {
            title: "Sentence Builder Quiz",
            desc: "Arrange words in the correct order to naturally master sentence structures.",
        },
        card2: {
            title: "Fill in the Blanks",
            desc: "Understand the context and fill in the missing words to build solid skills.",
        },
        card3: {
            title: "Word Flash Cards",
            desc: "Review words repeatedly to ensure long-term retention and mastery.",
        },
        features: [
            {
                title: "Accurate Assessment",
                desc: "Verify your understanding through diverse interactive problems.",
            },
            {
                title: "Reinforced Learning",
                desc: "Strengthen your memory by revisiting and correcting mistakes.",
            },
            {
                title: "Progress Analytics",
                desc: "Track your growth with data-driven insights and learning history.",
            },
            {
                title: "Achievement & Motivation",
                desc: "Build consistent habits through rewarding, step-by-step learning.",
            },
        ],
        previews: {
            quizPrompt: "I have a meeting in the morning.",
            quizInstruction: "Tap the words to complete the sentence",
            blankFeedback: "✓ Correct! café",
            blankTip: "Tip: 'Tomar' is commonly used for 'to drink' in Spanish.",
            flashHint: "Tap the card to flip it over",
            flashMeaning: "Trip / Journey",
            flashExample: "¡Buen viaje! (Have a nice trip!)",
            flashKnow: "I know it",
            flashUnknown: "Learning",
        },
    },
};

export default function InteractiveLearningSection({
    lang = "ko",
}: InteractiveLearningSectionProps) {
    const t = translations[lang];

    return (
        <section className="relative overflow-hidden bg-[#f8f5f1] pt-12 pb-24">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                {/* Top Badge */}
                <div className="flex justify-center">
                    <div className="rounded-full border border-[#8BAA8C]/40 bg-[#eef6ee] px-5 py-2 text-sm font-medium text-[#5F7D60]">
                        {t.badge}
                    </div>
                </div>

                {/* Heading */}
                <div className="mx-auto mt-8 max-w-4xl text-center">
                    <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-[#1c1c1c] md:text-5xl lg:text-6xl break-keep">
                        {t.title}
                    </h2>

                    <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#666] md:text-lg break-keep">
                        {t.description}
                    </p>
                </div>

                {/* Cards */}
                <div className="mt-16 grid gap-6 lg:grid-cols-3">
                    {/* Card 1 */}
                    <LearningCard
                        number="01"
                        title={t.card1.title}
                        description={t.card1.desc}
                        accent="orange"
                        icon={<MoveHorizontal className="h-5 w-5" />}
                    >
                        <SentenceArrangementPreview lang={lang} />
                    </LearningCard>

                    {/* Card 2 */}
                    <LearningCard
                        number="02"
                        title={t.card2.title}
                        description={t.card2.desc}
                        accent="green"
                        icon={<PencilLine className="h-5 w-5" />}
                    >
                        <FillBlankPreview lang={lang} />
                    </LearningCard>

                    {/* Card 3 */}
                    <LearningCard
                        number="03"
                        title={t.card3.title}
                        description={t.card3.desc}
                        accent="yellow"
                        icon={<Layers3 className="h-5 w-5" />}
                    >
                        <FlashCardPreview lang={lang} />
                    </LearningCard>
                </div>

                {/* Bottom Features */}
                <div className="mt-16 grid gap-4 rounded-[32px] border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur md:grid-cols-2 xl:grid-cols-4">
                    <FeatureItem
                        icon={<CheckCircle2 className="h-5 w-5" />}
                        title={t.features[0].title}
                        desc={t.features[0].desc}
                        iconBg="bg-blue-50"
                        iconColor="text-blue-600"
                    />

                    <FeatureItem
                        icon={<Repeat className="h-5 w-5" />}
                        title={t.features[1].title}
                        desc={t.features[1].desc}
                        iconBg="bg-emerald-50"
                        iconColor="text-emerald-600"
                    />

                    <FeatureItem
                        icon={<BarChart3 className="h-5 w-5" />}
                        title={t.features[2].title}
                        desc={t.features[2].desc}
                        iconBg="bg-amber-50"
                        iconColor="text-amber-600"
                    />

                    <FeatureItem
                        icon={<Trophy className="h-5 w-5" />}
                        title={t.features[3].title}
                        desc={t.features[3].desc}
                        iconBg="bg-rose-50"
                        iconColor="text-rose-600"
                    />
                </div>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/*                                   CARD                                     */
/* -------------------------------------------------------------------------- */

function LearningCard({
    number,
    title,
    description,
    accent,
    icon,
    children,
}: {
    number: string;
    title: string;
    description: string;
    accent: "orange" | "green" | "yellow";
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    const styles = {
        orange: {
            border: "border-[#f5d7c8]",
            bg: "bg-[#fff8f4]",
            badge: "bg-[#f07f53]",
        },
        green: {
            border: "border-[#d7e8d7]",
            bg: "bg-[#f6fbf6]",
            badge: "bg-[#6C9B6E]",
        },
        yellow: {
            border: "border-[#f3e2b6]",
            bg: "bg-[#fffaf0]",
            badge: "bg-[#f2b632]",
        },
    };

    return (
        <div
            className={`rounded-[32px] border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${styles[accent].border} ${styles[accent].bg}`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${styles[accent].badge}`}
                >
                    {number}
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-[#444]">{icon}</div>
                    <h3 className="text-lg font-bold text-[#1c1c1c]">{title}</h3>
                </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[#666] break-keep min-h-[40px]">
                {description}
            </p>

            <div className="mt-6">{children}</div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                              PREVIEW COMPONENTS                            */
/* -------------------------------------------------------------------------- */

function SentenceArrangementPreview({ lang }: { lang: "ko" | "en" }) {
    const t = translations[lang].previews;
    return (
        <div className="rounded-[24px] bg-white p-4 shadow-sm">
            {/* Prompt */}
            <div className="mb-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#f07f53]">Translation Quiz</span>
                <p className="mt-0.5 text-base font-bold text-[#1c1c1c] break-keep">
                    {t.quizPrompt}
                </p>
                {lang === "ko" && (
                    <p className="text-[11px] text-[#888] italic leading-tight">I have a meeting in the morning.</p>
                )}
            </div>

            {/* Answer Area (Slots) */}
            <div className="mt-3 min-h-[52px] rounded-xl border-2 border-dashed border-[#f5d7c8] bg-[#fffaf8] p-2">
                <div className="flex flex-wrap gap-1.5">
                    {["Tengo", "una", "reunión"].map((word, i) => (
                        <div
                            key={i}
                            className="rounded-lg bg-[#f07f53] px-2.5 py-1 text-xs font-bold text-white shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-300"
                        >
                            {word}
                        </div>
                    ))}
                    {/* Empty slots indicator */}
                    <div className="h-6 w-12 rounded-lg border-2 border-dashed border-[#f5d7c8]" />
                    <div className="h-6 w-16 rounded-lg border-2 border-dashed border-[#f5d7c8]" />
                </div>
            </div>

            {/* Scrambled Words (Options) */}
            <div className="mt-4">
                <p className="text-[10px] font-bold text-[#aaa] mb-2">{t.quizInstruction}</p>
                <div className="flex flex-wrap gap-1.5">
                    {["mañana", "en"].map((word) => (
                        <button
                            key={word}
                            className="rounded-lg border-2 border-[#f0f0f0] bg-white px-3 py-1.5 text-xs font-bold text-[#444] shadow-sm transition-all hover:border-[#f07f53] hover:text-[#f07f53] active:scale-95"
                        >
                            {word}
                        </button>
                    ))}
                    {/* Already selected (dimmed) */}
                    {["Tengo", "una", "reunión"].map((word) => (
                        <div
                            key={word}
                            className="rounded-lg bg-[#f5f5f5] px-3 py-1.5 text-xs font-bold text-[#ccc] cursor-default"
                        >
                            {word}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function FillBlankPreview({ lang }: { lang: "ko" | "en" }) {
    const t = translations[lang].previews;
    return (
        <div className="rounded-[24px] bg-white p-4 shadow-sm">
            <div className="flex gap-1.5">
                <div className="h-1.5 w-10 rounded-full bg-[#6CBE72]" />
                <div className="h-1.5 w-10 rounded-full bg-[#6CBE72]" />
                <div className="h-1.5 w-10 rounded-full bg-[#E5E5E5]" />
                <div className="h-1.5 w-10 rounded-full bg-[#E5E5E5]" />
            </div>

            <p className="mt-4 text-lg font-medium text-[#222]">
                Me gusta tomar ____ por la mañana.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
                <button className="rounded-xl border border-[#93d29a] bg-[#e8f8ea] px-2 py-2 text-sm font-medium text-[#3d8a45]">
                    café
                </button>

                <button className="rounded-xl border border-[#e6e6e6] bg-white px-2 py-2 text-sm font-medium">
                    casa
                </button>

                <button className="rounded-xl border border-[#e6e6e6] bg-white px-2 py-2 text-sm font-medium">
                    libro
                </button>
            </div>

            <div className="mt-4 rounded-xl bg-[#f3fbf4] p-3 text-xs text-[#4c8a52]">
                {t.blankFeedback}
            </div>

            <div className="mt-3 p-2 bg-[#f0f9f0] rounded-lg border border-[#d1e9d3]">
                <p className="text-[10px] text-[#4c8a52] leading-tight font-medium">
                    {t.blankTip}
                </p>
            </div>
        </div>
    );
}

function FlashCardPreview({ lang }: { lang: "ko" | "en" }) {
    const t = translations[lang].previews;
    return (
        <div className="rounded-[24px] bg-white p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <div className="text-[11px] text-[#888]">1 / 20</div>
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#f2b632]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                </div>
            </div>

            <div className="text-center py-2">
                <h4 className="text-4xl font-bold text-[#222]">viaje</h4>
                <p className="mt-1 text-base text-[#666]">{t.flashMeaning}</p>
                <p className="mt-2 text-[11px] text-[#999] italic">{t.flashExample}</p>
            </div>

            <div className="mt-4 flex gap-2">
                <button className="flex-1 py-1.5 rounded-lg bg-[#f0f9f0] border border-[#d1e9d3] text-[10px] font-bold text-[#4c8a52] hover:bg-[#e1f2e3]">
                    {t.flashKnow}
                </button>
                <button className="flex-1 py-1.5 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[10px] font-bold text-[#be123c] hover:bg-[#ffe4e6]">
                    {t.flashUnknown}
                </button>
            </div>

            <div className="mt-5 border-t border-dashed border-[#ddd] pt-3 text-center text-[10px] text-[#888]">
                {t.flashHint}
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*                                FEATURE ITEM                                */
/* -------------------------------------------------------------------------- */

function FeatureItem({
    icon,
    title,
    desc,
    iconBg,
    iconColor,
}: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    iconBg: string;
    iconColor: string;
}) {
    return (
        <div className="flex gap-4 rounded-2xl p-3">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
                {icon}
            </div>

            <div>
                <h4 className="font-semibold text-[#1c1c1c]">{title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-[#666] break-keep">{desc}</p>
            </div>
        </div>
    );
}