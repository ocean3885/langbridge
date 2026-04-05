import { getAppUserFromServer } from '@/lib/auth/app-user';
import { DEFAULT_LEARNING_CATEGORY_NAME } from '@/lib/learning-category';
import { listVideosSqlite } from '@/lib/sqlite/videos';
import { listEduVideosSqlite } from '@/lib/sqlite/edu-videos';
import { listSqliteCategories, listAllSqliteCategories } from '@/lib/sqlite/categories';
import { listAllAudioContentSqlite } from '@/lib/sqlite/audio-content';
import { countAuthUsersSqlite } from '@/lib/sqlite/auth-users';
import { listSqliteLanguages } from '@/lib/sqlite/languages';
import Image from 'next/image';
import HeroSection from '@/components/home/HeroSection';
import EduVideoSection, { type EduVideo } from '@/components/home/EduVideoSection';
import LBVideoSection, { type LBVideo } from '@/components/home/LBVideoSection';
import LBAudioSection, { type LBAudio, type LBAudioCategory } from '@/components/home/LBAudioSection';
import MyVideoSection, { type UserVideo, type VideoCategory } from '@/components/home/MyVideoSection';

export default async function HomePage() {
  const user = await getAppUserFromServer();
  const userCount = await countAuthUsersSqlite();
  const sqliteLanguages = await listSqliteLanguages();
  const languageNameMap = new Map(sqliteLanguages.map((l) => [l.id, l.name_ko]));

  let lbAudioCategories: LBAudioCategory[] = [];
  let videoCategories: VideoCategory[] = [];

  if (user) {
    // ── 비디오 ────────────────────────────────────────
    const userVideos = await listVideosSqlite({ uploaderId: user.id, channelId: null, limit: 10 });
    const sqliteVideoCategories = await listSqliteCategories('user_categories', user.id);
    const videoCategoryMap: Record<string, { name: string; languageName: string }> = {};
    for (const c of sqliteVideoCategories) {
      videoCategoryMap[String(c.id)] = {
        name: c.name,
        languageName: c.language_id ? (languageNameMap.get(c.language_id) ?? '언어 미지정') : '언어 미지정',
      };
    }

    const videoGroups: Record<string, UserVideo[]> = {};
    userVideos.forEach((v) => {
      const key = v.category_id === null ? 'uncategorized' : String(v.category_id);
      if (!videoGroups[key]) videoGroups[key] = [];
      videoGroups[key].push({
        id: v.id,
        title: v.title,
        youtube_id: v.youtube_id,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        created_at: v.created_at,
        category_id: v.category_id as unknown as number | null,
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
  const adminRows = (await listEduVideosSqlite())
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
  const publicRows = await listVideosSqlite({ visibility: 'public', limit: 6 });
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
  const allAudios = await listAllAudioContentSqlite(60);

  // 카테고리 정보를 위해 모든 lang_categories 조회 (user_id 무관)
  const allAudioCatRows = await listAllSqliteCategories('lang_categories');
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
    lbAudioGroups[key].push({ id: a.id, title: a.title, created_at: a.created_at, category_id: a.category_id });
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