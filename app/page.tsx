import { createClient } from '@/lib/supabase/server'; // 서버 클라이언트 임포트
import Link from 'next/link';

export default async function HomePage() {
  const supabase = await createClient();

const { data: userCountData, error: rpcError } = await supabase
    .rpc('get_user_count'); 

  // 에러 처리
  if (rpcError) {
    console.error('RPC 사용자 수 오류:', rpcError.message);
  }

  // 최종 카운트
  const userCount = rpcError ? 0 : userCountData ?? 0;

  return (
    <div className="text-center"> {/* 💡 1. 텍스트 중앙 정렬 */}
      
      {/* 💡 2. 제목 스타일: 5xl 크기, 굵은 글꼴, 텍스트 색상, 하단 여백 */}
      <h1 className="text-5xl font-bold text-gray-900 mb-4">환영합니다! LangBridge에 오신 것을</h1>
      
      {/* 부제 스타일: xl 크기, 텍스트 색상, 하단 여백 */}
      <p className="text-xl text-gray-600 mb-8">
        Next.js, Supabase, Tailwind를 사용한 풀스택 언어 교환 플랫폼입니다.
      </p>

      {/* 💡 생성 버튼 추가 */}
      <div className="mb-8">
        <Link 
          href="/upload"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          콘텐츠 생성하기
        </Link>
      </div>

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