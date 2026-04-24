import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseEduVideoChannel = {
  id: string;
  channel_name: string;
  channel_url: string | null;
  channel_description: string | null;
  thumbnail_url: string | null;
  language_id: number | null;
  created_at: string;
  updated_at: string;
};

export async function listEduVideoChannels(): Promise<SupabaseEduVideoChannel[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('edu_video_channels')
    .select('*')
    .order('channel_name', { ascending: true });

  if (error || !data) return [];
  return data as SupabaseEduVideoChannel[];
}

export async function listEduVideoChannelsWithVideoCount(): Promise<Array<SupabaseEduVideoChannel & { video_count: number }>> {
  const supabase = createAdminClient();
  
  // Supabase doesn't easily do JOINS with counts in the JS client without RPC.
  // We'll fetch all channels and then counts for each.
  // (In a real app, RPC is better).
  const { data: channels, error } = await supabase
    .from('edu_video_channels')
    .select('*, videos(id)')
    .order('created_at', { ascending: false });

  if (error || !channels) return [];

  return channels.map(vc => ({
    ...vc,
    video_count: vc.videos ? vc.videos.length : 0
  })) as any;
}

export async function getEduVideoChannelById(channelId: string): Promise<SupabaseEduVideoChannel | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('edu_video_channels')
    .select('*')
    .eq('id', channelId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SupabaseEduVideoChannel;
}

export async function insertEduVideoChannel(input: {
  channelName: string;
  channelUrl?: string | null;
  channelDescription?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const id = randomUUID();

  const { error } = await supabase
    .from('edu_video_channels')
    .insert({
      id,
      channel_name: input.channelName,
      channel_url: input.channelUrl ?? null,
      channel_description: input.channelDescription ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      language_id: input.languageId ?? null
    });

  if (error) throw new Error(`채널 등록 실패: ${error.message}`);
  return id;
}

export async function updateEduVideoChannel(input: {
  channelId: string;
  channelName: string;
  channelUrl?: string | null;
  channelDescription?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from('edu_video_channels')
    .update({
      channel_name: input.channelName,
      channel_url: input.channelUrl ?? null,
      channel_description: input.channelDescription ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      language_id: input.languageId ?? null,
      updated_at: new Date().toISOString()
    })
    .eq('id', input.channelId);

  if (error) throw new Error(`채널 수정 실패: ${error.message}`);
  return true; // Supabase JS client update doesn't return changes count easily without 'exact' count
}
