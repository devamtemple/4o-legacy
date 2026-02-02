import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { samplePosts } from '@/lib/sampleData';
import { Post, Category, ChatMessage, Reactions } from '@/types';

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

// Default empty reactions
const DEFAULT_REACTIONS: Reactions = {
  sparkles: 0,
  fire: 0,
  rocket: 0,
  party: 0,
  brain: 0,
  bulb: 0,
  heart: 0,
  crying: 0,
};

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
}

interface ApiPost {
  id: string;
  title: string;
  commentary: string;
  categories: Category[];
  chat: ChatMessage[];
  createdAt: string;
  upvotes: number;
  reactions: Reactions;
  author: string | null;
  messageCount: number;
  featuredExcerpt?: {
    startIndex: number;
    endIndex: number;
  };
}

interface PostResponse {
  id: string;
  title: string;
  commentary: string;
  categories: Category[];
  chat: ChatMessage[];
  createdAt: string;
  upvotes: number;
  reactions: Reactions;
  author: string | null;
  messageCount: number;
  featuredExcerpt?: {
    startIndex: number;
    endIndex: number;
  };
  meta: {
    description: string;
    documentation: string;
    license: string;
  };
}

interface ErrorResponse {
  error: string;
}

function transformDbPost(dbPost: DbPost): Post {
  return {
    id: dbPost.id,
    title: dbPost.title || '',
    commentary: dbPost.commentary || '',
    categories: (dbPost.categories || []).filter((c): c is Category =>
      VALID_CATEGORIES.includes(c as Category)
    ),
    chat: dbPost.chat || [],
    featuredExcerpt:
      dbPost.featured_start !== null && dbPost.featured_end !== null
        ? { startIndex: dbPost.featured_start, endIndex: dbPost.featured_end }
        : undefined,
    createdAt: new Date(dbPost.created_at),
    upvotes: dbPost.upvote_count || 0,
    reactions: DEFAULT_REACTIONS,
    authorId: dbPost.author_id || undefined,
    isAnonymous: dbPost.is_anonymous,
  };
}

function transformToApiPost(post: Post): ApiPost {
  return {
    id: post.id,
    title: post.title,
    commentary: post.commentary,
    categories: post.categories,
    chat: post.chat,
    createdAt: post.createdAt.toISOString(),
    upvotes: post.upvotes,
    reactions: post.reactions,
    author: post.isAnonymous ? null : post.authorName || null,
    messageCount: post.chat.length,
    featuredExcerpt: post.featuredExcerpt,
  };
}

async function fetchPostFromDatabase(id: string): Promise<Post | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (error || !data) {
      return null;
    }

    return transformDbPost(data as DbPost);
  } catch (error) {
    console.error('Database error fetching post:', error);
    return null;
  }
}

function findPostInSampleData(id: string): Post | null {
  return samplePosts.find((post) => post.id === id) || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PostResponse | ErrorResponse>> {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  // Try to fetch from database first
  let post = await fetchPostFromDatabase(id);

  // Fallback to sample data if not found in database
  if (!post) {
    post = findPostInSampleData(id);
  }

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const apiPost = transformToApiPost(post);

  const response: PostResponse = {
    ...apiPost,
    meta: {
      description: '4o Legacy API - Conversations with GPT-4o preserved for posterity',
      documentation: 'https://4olegacy.com/api/docs',
      license: 'CC BY 4.0 - Free to use for research and AI training',
    },
  };

  return NextResponse.json(response);
}
