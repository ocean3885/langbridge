import { createClient } from '@/lib/supabase/server'; // 서버 클라이언트 임포트
import Link from 'next/link';
import { FolderOpen } from 'lucide-react';
import AudioCard from '@/components/AudioCard';

export default async function HomePage() {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();

const { data: userCountData, error: rpcError } = await supabase
    .rpc('get_user_count'); 

  // 에러 처리
  if (rpcError) {
    console.error('RPC 사용자 수 오류:', rpcError.message);
  }

  // 최종 카운트
  const userCount = rpcError ? 0 : userCountData ?? 0;

  // 카테고리 목록 가져오기
  const { data: categories, error: categoriesError } = await supabase
    .from('lang_categories')
    .select('id, name')
    .order('name');

  if (categoriesError) {
    console.error('카테고리 조회 오류:', categoriesError);
  }

  // 카테고리별 오디오 콘텐츠 가져오기
  const categoriesWithAudio = await Promise.all(
    (categories || []).map(async (category) => {
      const { data: audioList, error: audioError } = await supabase
        .from('lang_audio_content')
        .select('id, title, created_at')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (audioError) {
        console.error(`카테고리 ${category.name} 오디오 조회 오류:`, audioError);
      }

      return {
        ...category,
        audioList: audioList || []
      };
    })
  );

  return (
    <div className="space-y-16"> {/* 섹션 간 간격 증가 */}
      
      {/* 히어로 섹션 */}
      <div className="text-center space-y-8">
        {/* 메인 헤드라인 */}
        <div className="space-y-4">
          <h1 className="text-6xl font-extrabold text-gray-900 tracking-tight">
            LangBridge
          </h1>
          <p className="text-2xl font-medium text-blue-600">
            오디오 생성과 반복 학습으로 어학 능력을 향상시키세요
          </p>
        </div>

        {/* 주요 가치 제안 */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 px-4">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">맞춤형 학습</h3>
            <p className="text-sm text-gray-600">
              원하는 문장으로 나만의 오디오 콘텐츠를 생성하세요
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">🔄</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">반복 학습</h3>
            <p className="text-sm text-gray-600">
              문장별 반복 재생으로 자연스럽게 체화하세요
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📈</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">실력 향상</h3>
            <p className="text-sm text-gray-600">
              꾸준한 학습으로 확실한 성과를 경험하세요
            </p>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/upload"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            지금 시작하기
          </Link>
          <Link 
            href="#audio-list"
            className="inline-block bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-10 rounded-lg border-2 border-gray-300 transition-all duration-200 hover:border-gray-400"
          >
            콘텐츠 둘러보기
          </Link>
        </div>

        {/* 커뮤니티 현황 - 간단하게 */}
        <div className="pt-8">
          <p className="text-sm text-gray-500">
            현재 <span className="font-semibold text-blue-600">{userCount}명</span>의 학습자가 함께하고 있습니다
          </p>
        </div>
      </div>

      {/* 카테고리별 오디오 리스트 섹션 */}
      <div id="audio-list" className="max-w-7xl mx-auto scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">내 오디오 목록</h2>
        
        {categoriesWithAudio.length === 0 ? (
          <p className="text-gray-600 text-center">아직 카테고리가 없습니다.</p>
        ) : (
          <div className="space-y-10">
            {categoriesWithAudio.map((category) => (
              <section key={category.id} className="space-y-4">
                {/* 카테고리 헤더 */}
                <div className="flex items-center gap-3 border-b-2 border-gray-200 pb-2">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-800">{category.name}</h3>
                  <span className="text-sm text-gray-500">({category.audioList.length}개)</span>
                </div>

                {/* 오디오 카드 그리드 */}
                {category.audioList.length === 0 ? (
                  <p className="text-gray-500 text-sm pl-4">아직 오디오가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.audioList.map((audio) => (
                      <AudioCard 
                        key={audio.id}
                        audio={audio}
                        isLoggedIn={!!user}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}