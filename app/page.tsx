import { createClient } from '@/lib/supabase/server'; // 서버 클라이언트 임포트
import Link from 'next/link';
import { FolderOpen, Video, Clock } from 'lucide-react';
import AudioCard from '@/components/AudioCard';
import { getAllVideos } from '@/lib/supabase/queries/videos';
import Image from 'next/image';

type UserAudio = {
  id: string;
  title: string | null;
  created_at: string;
  category_id: number | null;
};

// 초를 MM:SS 또는 H:MM:SS 형식으로 변환
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default async function HomePage() {
  const supabase = await createClient();

  // 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser();

  // 비디오 목록 가져오기 (최신 6개)
  const { data: videos } = await getAllVideos();
  const recentVideos = videos.slice(0, 6);

const { data: userCountData, error: rpcError } = await supabase
    .rpc('get_user_count'); 

  // 에러 처리
  if (rpcError) {
    console.error('RPC 사용자 수 오류:', rpcError.message);
  }

  // 최종 카운트
  const userCount = rpcError ? 0 : userCountData ?? 0;

  // 로그인한 사용자 소유 오디오 목록 가져오기 (최신 60개)
  let userGroupedCategories: { id: number | null; name: string; languageName: string; audioList: UserAudio[] }[] = [];
  if (user) {
    const { data: userAudios, error: userAudioError } = await supabase
      .from('lang_audio_content')
      .select('id, title, created_at, category_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60);

    if (userAudioError) {
      console.error('내 오디오 조회 오류:', userAudioError);
    }

    const categoryIds = Array.from(new Set((userAudios || []).map(a => a.category_id).filter(id => id !== null))) as number[];
  const categoryMap: Record<number, { name: string; languageName: string }> = {};
    if (categoryIds.length > 0) {
      const { data: catRows, error: catErr } = await supabase
        .from('lang_categories')
        .select('id, name, language_id, languages(name_ko)')
        .eq('user_id', user.id)
        .in('id', categoryIds);
      if (catErr) {
        console.error('내 오디오 카테고리 이름 조회 오류:', catErr);
      }
      (catRows || []).forEach((c) => { 
        const languageData = Array.isArray(c.languages) ? c.languages[0] : c.languages;
        categoryMap[c.id] = {
          name: c.name,
          languageName: languageData?.name_ko || '언어 미지정'
        };
      });
    }

    // 그룹화
    const groups: Record<string, UserAudio[]> = {};
    (userAudios || []).forEach(a => {
      const key = a.category_id === null ? 'uncategorized' : String(a.category_id);
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    userGroupedCategories = Object.entries(groups).map(([key, list]) => {
      const catId = key === 'uncategorized' ? null : Number(key);
      return {
        id: catId,
          name: catId === null ? '미분류' : (categoryMap[catId]?.name || '알 수 없는 카테고리'),
          languageName: catId === null ? '' : (categoryMap[catId]?.languageName || ''),
        audioList: list
      };
    }).sort((a, b) => {
      // 미분류는 항상 마지막
      if (a.id === null) return 1;
      if (b.id === null) return -1;
      return a.name.localeCompare(b.name, 'ko');
    });
  }

  return (
    <div className="space-y-16"> {/* 섹션 간 간격 증가 */}
      
  {/* 히어로 섹션 */}
      <div className="text-center space-y-8">
        {/* 메인 헤드라인 */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-4">
            <span>LangBridge</span>
          </h1>
          <p className="text-lg sm:text-2xl font-medium text-blue-600">
            원어문장을 TTS 오디오로 변환하고 반복 학습으로 실력을 쌓으세요
          </p>
          <p className="text-base sm:text-xl font-medium text-cyan-600">
            📹 NEW! 영상 스크립트 반복 학습으로 실전 회화를 마스터하세요
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
            <div className="text-4xl mb-3">🎬</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">영상 학습 <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full ml-1">NEW</span></h3>
            <p className="text-sm text-gray-600">
              실제 영상 콘텐츠로 스크립트 반복 학습하세요
            </p>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/upload"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            오디오 만들기
          </Link>
          <Link 
            href="/videos"
            className="inline-block bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-10 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            영상 학습하기
          </Link>
        </div>

        {/* 커뮤니티 현황 - 간단하게 */}
        <div className="pt-8">
          <p className="text-sm text-gray-500">
            현재 <span className="font-semibold text-blue-600">{userCount}명</span>의 학습자가 함께하고 있습니다
          </p>
        </div>
      </div>

      {/* 학습 비디오 섹션 */}
      {recentVideos.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">학습 비디오</h2>
            </div>
            <Link 
              href="/videos" 
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
            >
              전체 보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentVideos.map((video) => (
              <Link
                key={video.id}
                href={`/videos/${video.id}`}
                className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* 썸네일 */}
                <div className="relative w-full aspect-video bg-gray-200">
                  {video.thumbnail_url ? (
                    <Image
                      src={video.thumbnail_url}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* 시간 배지 */}
                  {video.duration !== null && (
                    <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(video.duration)}</span>
                    </div>
                  )}
                </div>

                {/* 비디오 정보 */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {video.title}
                  </h3>
                  
                  {video.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {video.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {video.transcript_count || 0}개의 스크립트
                    </span>
                    <span>
                      {new Date(video.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 내 오디오 목록 섹션 */}
      <div id="audio-list" className="max-w-7xl mx-auto scroll-mt-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">내 오디오 목록</h2>
          {user && userGroupedCategories.length > 0 && (
            <Link 
              href="/my-audio" 
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition flex items-center gap-1"
            >
              전체 보기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>
        {!user && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-8 text-center space-y-4">
            <h3 className="text-xl font-bold text-gray-800">나만의 학습 오디오를 만들어 반복 학습을 시작하세요</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              문장을 입력하면 스페인어 TTS로 자동 변환되고, 맞춤형 반복 패턴으로 청취/그림자 따라하기 학습을 할 수 있습니다.<br/>
              가입 후 직접 문장을 업로드해 나만의 학습 재생 리스트를 구축해 보세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/sign-up" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">무료로 가입하기</Link>
              <Link href="/upload" className="px-6 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition">문장 업로드 미리보기</Link>
            </div>
          </div>
        )}
        {user && userGroupedCategories.length === 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-8 text-center space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800">첫 오디오를 만들어 학습을 시작해보세요</h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                문장을 입력하면 고품질 TTS로 오디오가 생성되고, 플레이어에서 문장별 반복과 메모로 학습할 수 있어요.
              </p>
            </div>
            <ul className="text-left mx-auto max-w-2xl space-y-2 text-sm sm:text-base">
              <li className="flex items-start gap-2"><span className="mt-0.5">📝</span><span>문장 입력 또는 붙여넣기 (여러 문장도 가능)</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">🌐</span><span>언어와 카테고리를 선택해 깔끔하게 정리</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">🔁</span><span>생성된 오디오에서 구간 반복과 그림자 따라하기</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">🗒️</span><span>문장별 메모로 깨달음과 예문을 기록</span></li>
            </ul>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/upload" className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">
                지금 업로드
              </Link>
            </div>
            <p className="text-xs text-gray-500">업로드는 언제든 삭제할 수 있어요. 나만의 학습 리듬을 만들어보세요!</p>
          </div>
        )}
        {user && userGroupedCategories.length > 0 && (
          <div className="space-y-10">
            {userGroupedCategories.map(category => (
              <section key={category.id ?? 'uncategorized'} className="space-y-4">
                <div className="flex items-center gap-3 border-b-2 border-gray-200 pb-2">
                  <FolderOpen className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-bold text-gray-800">
                      {category.name}
                      {category.languageName && (
                        <span className="ml-2 text-sm font-medium text-blue-600">({category.languageName})</span>
                      )}
                    </h3>
                  <span className="text-sm text-gray-500">({category.audioList.length}개)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.audioList.map(audio => (
                    <AudioCard
                      key={audio.id}
                      audio={audio}
                      isLoggedIn={true}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}