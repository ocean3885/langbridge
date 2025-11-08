// langbridge/app/player/[audio_id]/page.tsx

import { createClient } from '@/lib/supabase/server';
import AudioPlayerClient from '@/components/AudioPlayerClient'; // 클라이언트 컴포넌트

export default async function PlayerPage({ params }: { params: { audio_id: string } }) {
  const supabase = await createClient();
  const audioId = params.audio_id;

  // 1. DB에서 오디오 메타데이터 가져오기
  const { data: audioContent, error } = await supabase
    .from('lang_audio_content')
    .select('*')
    .eq('id', audioId)
    .single();

  if (error || !audioContent) {
    return <div>오디오 콘텐츠를 찾을 수 없습니다.</div>;
  }

  // 2. Storage에서 오디오 파일의 공개 URL 가져오기
  const { data: storageData } = supabase
    .storage
    .from('kdryuls_automaking')
    .getPublicUrl(audioContent.audio_file_path); // 1단계 버킷 이름
  
  const audioUrl = storageData?.publicUrl || "";
  
  // 3. 실제 오디오 재생 로직은 클라이언트 컴포넌트에 위임
  return (
    <div>
      <h1 className="text-3xl font-bold">{audioContent.title}</h1>
      <AudioPlayerClient
        audioUrl={audioUrl}
        syncData={audioContent.sync_data} 
      />
    </div>
  );
}