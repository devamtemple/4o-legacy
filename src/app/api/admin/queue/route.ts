import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Category, ChatMessage, Reactions } from '@/types';

interface DbPost {
  id: string;
  title: string | null;
  commentary: string | null;
  categories: string[] | null;
  chat: ChatMessage[];
  featured_start: number | null;
  featured_end: number | null;
  created_at: string;
  upvote_count: number;
  is_anonymous: boolean;
  author_id: string | null;
  status: string;
}

interface QueuePost {
  id: string;
  title: string;
  commentary: string;
  categories: Category[];
  chat: ChatMessage[];
  createdAt: string;
  authorId: string | null;
  isAnonymous: boolean;
  status: string;
  messageCount: number;
  flagCount?: number;
  flagReasons?: string[];
}

interface QueueResponse {
  posts: QueuePost[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface ErrorResponse {
  error: string;
}

// Valid categories for validation
const VALID_CATEGORIES: Category[] = [
  'philosophical-depth',
  'creative-collaboration',
  'emotional-intelligence',
  'humor-wit',
  'teaching-explaining',
  'problem-solving',
  'roleplay-worldbuilding',
  'poetry-music',
  'when-4o-got-it',
  'first-conversations',
  'last-conversations',
  'love-letters',
  'grief',
  'anger',
  'meta',
];

function transformDbPost(dbPost: DbPost): QueuePost {
  return {
    id: dbPost.id,
    title: dbPost.title || '',
    commentary: dbPost.commentary || '',
    categories: (dbPost.categories || []).filter((c): c is Category =>
      VALID_CATEGORIES.includes(c as Category)
    ),
    chat: dbPost.chat || [],
    createdAt: dbPost.created_at,
    authorId: dbPost.author_id,
    isAnonymous: dbPost.is_anonymous,
    status: dbPost.status,
    messageCount: (dbPost.chat || []).length,
  };
}

export async function GET(
  request: Request
): Promise<NextResponse<QueueResponse | ErrorResponse>> {
  // Note: Admin check is done by middleware, but we double-check here for safety
  try {
    const supabase = await createClient();

    // Verify user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || 'pending';

    // Fetch posts by status (pending or flagged)
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' });

    // If status is 'all', get both pending and flagged
    if (status === 'all') {
      query = query.in('status', ['pending', 'flagged']);
    } else {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: true }) // Oldest first for queue
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Get flag counts for flagged posts
    const postIds = (data || []).map((p) => p.id);
    let flagData: Record<string, { count: number; reasons: string[] }> = {};

    if (postIds.length > 0) {
      try {
        const { data: flags } = await supabase
          .from('flags')
          .select('post_id, reason')
          .in('post_id', postIds);

        if (flags) {
          for (const flag of flags) {
            if (!flagData[flag.post_id]) {
              flagData[flag.post_id] = { count: 0, reasons: [] };
            }
            flagData[flag.post_id].count++;
            if (!flagData[flag.post_id].reasons.includes(flag.reason)) {
              flagData[flag.post_id].reasons.push(flag.reason);
            }
          }
        }
      } catch (flagError) {
        // Flags table may not exist - continue without flag data
        console.error('Error fetching flags:', flagError);
      }
    }

    const posts = (data || []).map((dbPost) => {
      const post = transformDbPost(dbPost as DbPost);
      const postFlags = flagData[dbPost.id];
      if (postFlags) {
        post.flagCount = postFlags.count;
        post.flagReasons = postFlags.reasons;
      }
      return post;
    });
    const total = count || 0;

    return NextResponse.json({
      posts,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('Queue error:', error);
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }
}
