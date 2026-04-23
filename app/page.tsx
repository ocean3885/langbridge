import { getAppUserFromServer } from '@/lib/auth/app-user';
import { DEFAULT_LEARNING_CATEGORY_NAME } from '@/lib/learning-category';
import { listVideos, listAllUserCategoryVideos } from '@/lib/supabase/services/videos';
import { listEduVideos } from '@/lib/supabase/services/edu-videos';
import { listCategories, listAllCategories } from '@/lib/supabase/services/categories';
import { listAllAudioContent } from '@/lib/supabase/services/audio-content';
import { countAuthUsers } from '@/lib/supabase/services/auth-users';
import { listLanguages } from '@/lib/supabase/services/languages';
import { listAllVideoProgressForUser } from '@/lib/supabase/services/video-progress';
import Image from 'next/image';
import HeroSection from '@/components/home/HeroSection';
import EduVideoSection, { type EduVideo } from '@/components/home/EduVideoSection';
import LBVideoSection, { type LBVideo } from '@/components/home/LBVideoSection';
import LBAudioSection, { type LBAudio, type LBAudioCategory } from '@/components/home/LBAudioSection';
import MyVideoSection, { type UserVideo, type VideoCategory } from '@/components/home/MyVideoSection';

export default async function HomePage() {
  const user = await getAppUserFromServer();
  const userCount = await countAuthUsers();
  const languages = await listLanguages();
  const languageNameMap = new Map(languages.map((l) => [l.id, l.name_ko]));

  let lbAudioCategories: LBAudioCategory[] = [];
  let videoCategories: VideoCategory[] = [];

  if (user) {
    // ── 비디오 ─────────────────────────────────────────
    // uploaderId 기반 영상(최신 20개) + 전체 매핑 정보
    const [userUploads, userVideoCategories, allMyMappings, allMyProgress] = await Promise.all([
      listVideos({ uploaderId: user.id, limit: 20 }),
      listCategories('user_categories', user.id),
      listAllUserCategoryVideos(user.id),
      listAllVideoProgressForUser(user.id),
    ]);

    // 매핑된 모든 영상들의 세부 정보 가져오기 (업로드하지 않은 저장된 영상 포함)
    const mappedVideoIds = allMyMappings.map(m => m.video_id);
    const progressVideoIds = allMyProgress.map(p => p.video_id);
    
    // 유저 업로드 영상이 아니면서, 매핑이나 학습 기록이 있는 영상 ID들
    const otherVideoIds = Array.from(new Set([...mappedVideoIds, ...progressVideoIds]))
      .filter(id => !userUploads.some(v => v.id === id));
    
    let allRelevantVideos = [...userUploads];
    if (otherVideoIds.length > 0) {
      const savedVideoDetails = await listVideos({ videoIds: otherVideoIds });
      allRelevantVideos = [...allRelevantVideos, ...savedVideoDetails];
    }

    const videoCategoryMap: Record<string, { name: string; languageName: string }> = {};
    for (const c of userVideoCategories) {
      videoCategoryMap[String(c.id)] = {
        name: c.name,
        languageName: c.language_id ? (languageNameMap.get(c.language_id) ?? '언어 미지정') : '언어 미지정',
      };
    }

    // 매핑 테이블 기반으로 비디오 그룹화
    const videoGroups: Record<string, UserVideo[]> = {};

    // 1. 매핑 정보를 순회하며 비디오 분류
    allMyMappings.forEach((m) => {
      const v = allRelevantVideos.find(rv => rv.id === m.video_id);
      if (!v) return;

      const key = String(m.category_id);
      if (!videoGroups[key]) videoGroups[key] = [];
      
      videoGroups[key].push({
        id: v.id,
        title: v.title,
        youtube_id: v.youtube_id,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        created_at: v.created_at,
        category_id: m.category_id,
        videoLanguageName: v.language_name,
      });
    });

    // 2. 매핑되지 않았지만 본인 업로드이거나 학습 기록이 있는 영상들 처리 (학습일반)
    allRelevantVideos.forEach((v) => {
      // 어떤 카테고리에도 매핑되지 않은 경우만 학습일반(미분류)으로 추가
      const isMapped = allMyMappings.some(m => m.video_id === v.id);
      if (isMapped) return;

      // 본인 업로드이거나 학습 기록이 있는 경우에만 포함
      const isUploader = v.uploader_id === user.id;
      const hasProgress = allMyProgress.some(p => p.video_id === v.id);
      
      if (!isUploader && !hasProgress) return;

      const key = 'uncategorized';
      if (!videoGroups[key]) videoGroups[key] = [];
      videoGroups[key].push({
        id: v.id,
        title: v.title,
        youtube_id: v.youtube_id,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        created_at: v.created_at,
        category_id: null,
        videoLanguageName: v.language_name,
      });
    });

    videoCategories = Object.entries(videoGroups)
      .map(([key, list]) => {
        const catId = key === 'uncategorized' ? null : Number(key);
        return {
          id: catId,
          name: catId === null ? DEFAULT_LEARNING_CATEGORY_NAME : (videoCategoryMap[String(catId)]?.name || '알 수 없는 카테고리'),
          languageName: catId === null ? '' : (videoCategoryMap[String(catId)]?.languageName || ''),
          videoList: list,
        };
      })
      .sort((a, b) => {
        if (a.id === null) return 1;
        if (b.id === null) return -1;
        return a.name.localeCompare(b.name, 'ko');
      });
  }

  // ── 어학 강의 영상 (운영자 영상) ──────────────────────
  const adminRows = (await listEduVideos())
    .sort((a, b) => {
      const aHas = Boolean(a.channel_name?.trim());
      const bHas = Boolean(b.channel_name?.trim());
      if (aHas !== bHas) return aHas ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, 6);

  const learningVideos: EduVideo[] = adminRows.map((v) => ({
    id: v.id,
    title: v.title,
    youtube_url: v.youtube_url ?? null,
    thumbnail_url: v.thumbnail_url ?? null,
    created_at: v.created_at,
    channel_name: v.channel_name ?? null,
    language_name: v.language_name ?? null,
  }));

  // ── LB 학습 영상 (공개 영상) ──────────────────────
  const publicRows = await listVideos({ visibility: 'public', limit: 6 });
  const lbVideos: LBVideo[] = publicRows.map((v) => ({
    id: v.id,
    title: v.title,
    youtube_id: v.youtube_id,
    thumbnail_url: v.thumbnail_url,
    duration: v.duration,
    created_at: v.created_at,
    channel_name: v.channel_name ?? null,
    language_name: v.language_name ?? null,
  }));

  // ── LB 문장 학습 (전체 오디오) ──────────────────────
  const allAudios = await listAllAudioContent(60);

  // 카테고리 정보를 위해 모든 lang_categories 조회
  const allAudioCatRows = await listAllCategories('lang_categories');
  const allAudioCatMap: Record<number, { name: string; languageName: string }> = {};
  allAudioCatRows.forEach((c) => {
    allAudioCatMap[c.id] = {
      name: c.name,
      languageName: c.language_id ? (languageNameMap.get(c.language_id) ?? '언어 미지정') : '언어 미지정',
    };
  });

  const lbAudioGroups: Record<string, LBAudio[]> = {};
  allAudios.forEach((a) => {
    const key = a.category_id === null ? 'uncategorized' : String(a.category_id);
    if (!lbAudioGroups[key]) lbAudioGroups[key] = [];
    lbAudioGroups[key].push({ id: a.id, title: a.title || '', created_at: a.created_at, category_id: a.category_id });
  });

  lbAudioCategories = Object.entries(lbAudioGroups)
    .map(([key, list]) => {
      const catId = key === 'uncategorized' ? null : Number(key);
      return {
        id: catId,
        name: catId === null ? DEFAULT_LEARNING_CATEGORY_NAME : (allAudioCatMap[catId]?.name || '알 수 없는 카테고리'),
        languageName: catId === null ? '' : (allAudioCatMap[catId]?.languageName || ''),
        audioList: list,
      };
    })
    .sort((a, b) => {
      if (a.id === null) return 1;
      if (b.id === null) return -1;
      return a.name.localeCompare(b.name, 'ko');
    });

  return (
    <div className="space-y-11">
      <HeroSection userCount={userCount} />

      {/* 메인 이미지 */}
      <section className="w-full">
        <div className="max-w-7xl mx-auto">
          <Image
            src="/images/main.png"
            alt="LangBridge 소개 이미지"
            width={1600}
            height={640}
            priority
            className="w-full h-[320px] sm:h-[420px] object-cover rounded-xl shadow-lg"
            sizes="100vw"
            quality={90}
          />
        </div>
      </section>

      <EduVideoSection videos={learningVideos} />
      <LBVideoSection videos={lbVideos} />
      <LBAudioSection isLoggedIn={!!user} categories={lbAudioCategories} />
      <MyVideoSection isLoggedIn={!!user} categories={videoCategories} />
    </div>
  );
}