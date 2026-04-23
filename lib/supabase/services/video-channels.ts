import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export type SupabaseVideoChannel = {
  id: string;
  channel_name: string;
  channel_url: string | null;
  channel_description: string | null;
  thumbnail_url: string | null;
  language_id: number | null;
  created_at: string;
  updated_at: string;
};

export async function listVideoChannels(): Promise<SupabaseVideoChannel[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_channels')
    .select('*')
    .order('channel_name', { ascending: true });

  if (error || !data) return [];
  return data as SupabaseVideoChannel[];
}

export async function listVideoChannelsWithVideoCount(): Promise<Array<SupabaseVideoChannel & { video_count: number }>> {
  const supabase = createAdminClient();
  
  // Supabase doesn't easily do JOINS with counts in the JS client without RPC.
  // We'll fetch all channels and then counts for each.
  // (In a real app, RPC is better).
  const { data: channels, error } = await supabase
    .from('video_channels')
    .select('*, videos(id)')
    .order('created_at', { ascending: false });

  if (error || !channels) return [];

  return channels.map(vc => ({
    ...vc,
    video_count: vc.videos ? vc.videos.length : 0
  })) as any;
}

export async function getVideoChannelById(channelId: string): Promise<SupabaseVideoChannel | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('video_channels')
    .select('*')
    .eq('id', channelId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SupabaseVideoChannel;
}

export async function insertVideoChannel(input: {
  channelName: string;
  channelUrl?: string | null;
  channelDescription?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const id = randomUUID();

  const { error } = await supabase
    .from('video_channels')
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

export async function updateVideoChannel(input: {
  channelId: string;
  channelName: string;
  channelUrl?: string | null;
  channelDescription?: string | null;
  thumbnailUrl?: string | null;
  languageId?: number | null;
}): Promise<boolean> {
  const supabase = createAdminClient();
  const { error, count } = await supabase
    .from('video_channels')
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
