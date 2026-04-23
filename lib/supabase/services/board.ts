import { createAdminClient } from '@/lib/supabase/admin';

export interface SupabaseBoardPost {
  id: number;
  user_id: string;
  user_email: string | null;
  title: string;
  content: string;
  file_name: string | null;
  file_path: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export async function listBoardPosts(input?: {
  limit?: number;
  offset?: number;
}): Promise<{ posts: SupabaseBoardPost[]; total: number }> {
  const supabase = createAdminClient();
  const limit = input?.limit ?? 20;
  const offset = input?.offset ?? 0;

  const { data: posts, error: postsError, count } = await supabase
    .from('board_posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (postsError) {
    throw new Error(`Failed to list board posts: ${postsError.message}`);
  }

  return { posts: posts as SupabaseBoardPost[], total: count ?? 0 };
}

export async function getBoardPost(postId: number): Promise<SupabaseBoardPost | undefined> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('board_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle();

  if (error || !data) return undefined;
  return data as SupabaseBoardPost;
}

export async function createBoardPost(input: {
  userId: string;
  userEmail: string | null;
  title: string;
  content: string;
  fileName: string | null;
  filePath: string | null;
}): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('board_posts')
    .insert({
      user_id: input.userId,
      user_email: input.userEmail,
      title: input.title,
      content: input.content,
      file_name: input.fileName,
      file_path: input.filePath
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create board post: ${error?.message}`);
  }

  return data.id;
}

export async function deleteBoardPost(postId: number): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('board_posts').delete().eq('id', postId);
  if (error) {
    throw new Error(`Failed to delete board post: ${error.message}`);
  }
}

export async function incrementBoardPostView(postId: number): Promise<void> {
  const supabase = createAdminClient();
  const { data } = await supabase.from('board_posts').select('view_count').eq('id', postId).single();
  
  if (data) {
    await supabase
      .from('board_posts')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', postId);
  }
}
