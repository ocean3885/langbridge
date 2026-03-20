import { TutorialStep } from "./tutorial-step";
import { CodeBlock } from "./code-block";

const env = `# .env.local
SQLITE_DB_PATH=.data/langbridge.sqlite
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
`.trim();

const server = `import { getSqliteDb } from '@/lib/sqlite/db'

export default async function Page() {
  const db = await getSqliteDb()
  const rows = await db.all('SELECT id, name FROM languages ORDER BY name_ko ASC LIMIT 20')

  return <pre>{JSON.stringify(rows, null, 2)}</pre>
}
`.trim();

const client = `'use client'

import { useEffect, useState } from 'react'

export default function Page() {
  const [me, setMe] = useState<any | null>(null)

  useEffect(() => {
    const getData = async () => {
      const res = await fetch('/api/me')
      const data = await res.json()
      setMe(data)
    }
    getData()
  }, [])

  return <pre>{JSON.stringify(me, null, 2)}</pre>
}
`.trim();

export function FetchDataSteps() {
  return (
    <ol className="flex flex-col gap-6">
      <TutorialStep title="Set environment variables">
        <p>
          LangBridge는 앱 데이터 저장에 SQLite를 사용하고, 미디어 파일 업로드에만
          Supabase Storage를 사용합니다. 먼저 환경 변수를 설정하세요.
        </p>
        <CodeBlock code={env} />
      </TutorialStep>

      <TutorialStep title="Query SQLite data from Next.js (Server Component)">
        <p>
          서버 컴포넌트에서는 SQLite 헬퍼를 직접 사용해 데이터를 읽을 수 있습니다.
        </p>
        <CodeBlock code={server} />
      </TutorialStep>

      <TutorialStep title="Fetch app user state from client">
        <p>
          클라이언트 컴포넌트에서는 <code>/api/me</code>를 통해 현재 사용자 상태를
          조회할 수 있습니다.
        </p>
        <p>
          예시 페이지를{" "}
          <span className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs font-medium text-secondary-foreground border">
            /app/notes/page.tsx
          </span>{" "}
          에 만들고 다음 코드를 사용하세요.
        </p>
        <CodeBlock code={client} />
      </TutorialStep>

      <TutorialStep title="Explore the Supabase UI Library">
        <p>
          Head over to the{" "}
          <a
            href="https://supabase.com/ui"
            className="font-bold hover:underline text-foreground/80"
          >
            Supabase UI library
          </a>{" "}
          and try installing some blocks. For example, you can install a
          Realtime Chat block by running:
        </p>
        <CodeBlock
          code={
            "npx shadcn@latest add https://supabase.com/ui/r/realtime-chat-nextjs.json"
          }
        />
      </TutorialStep>

      <TutorialStep title="Build in a weekend and scale to millions!">
        <p>You&apos;re ready to launch your product to the world! 🚀</p>
      </TutorialStep>
    </ol>
  );
}
