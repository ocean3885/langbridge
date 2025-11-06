// langbridge/app/page.tsx

import { createClient } from '@/lib/supabase/server'; // 서버 클라이언트 임포트

export default async function HomePage() {
  const supabase = await createClient();

  // 데이터 로직: 총 사용자 수 가져오기
  const { count, error } = await supabase
    .from('users') 
    .select('*', { count: 'exact', head: true });

  if (error) {
    // 실제 운영 환경에서는 오류 로깅만 하고 사용자에게는 노출하지 않는 것이 좋습니다.
    console.error('사용자 수를 가져오는 중 오류 발생:', error.message);
  }

  const userCount = count ?? 0;

  return (
    <div className="text-center"> {/* 💡 1. 텍스트 중앙 정렬 */}
      
      {/* 💡 2. 제목 스타일: 5xl 크기, 굵은 글꼴, 텍스트 색상, 하단 여백 */}
      <h1 className="text-5xl font-bold text-gray-900 mb-4">환영합니다! LangBridge에 오신 것을</h1>
      
      {/* 💡 3. 부제 스타일: xl 크기, 텍스트 색상, 하단 여백 */}
      <p className="text-xl text-gray-600 mb-8">
        Next.js, Supabase, Tailwind를 사용한 풀스택 언어 교환 플랫폼입니다.
      </p>

      {/* 가져온 데이터를 표시하는 섹션 */}
      {/* 💡 4. 섹션 스타일: 배경색, 패딩, 둥근 모서리, 그림자 */}
      <section className="bg-blue-50 p-6 rounded-lg shadow-xl max-w-lg mx-auto">
        
        {/* 💡 5. 섹션 제목 스타일: 3xl 크기, 굵은 글꼴, 텍스트 색상, 하단 여백 */}
        <h2 className="text-3xl font-semibold text-blue-800 mb-3">현재 커뮤니티 현황</h2>
        
        {/* 💡 6. 카운트 숫자 스타일: 4xl 크기, 가장 굵은 글꼴, 텍스트 색상 */}
        <p className="text-4xl font-extrabold text-blue-600">
          총 등록 사용자 수: {userCount} 명
        </p>
        
        {/* 💡 7. 참고 텍스트 스타일: 텍스트 색상, 상단 여백 */}
        <p className="text-gray-700 mt-2">
          (이 숫자는 Supabase DB에서 실시간으로 가져온 것입니다.)
        </p>
      </section>
      
    </div>
  );
}