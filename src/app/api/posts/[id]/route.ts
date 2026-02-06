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

type DbRow = Record<string, unknown>;

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

function transformDbPost(row: DbRow): Post {
  const featuredStart = row['featured_start'] as number | null;
  const featuredEnd = row['featured_end'] as number | null;
  const categories = (row['categories'] as string[] | null) || [];

  return {
    id: row['id'] as string,
    title: (row['title'] as string | null) || '',
    commentary: (row['commentary'] as string | null) || '',
    categories: categories.filter((c): c is Category =>
      VALID_CATEGORIES.includes(c as Category)
    ),
    chat: (row['chat'] as ChatMessage[]) || [],
    featuredExcerpt:
      featuredStart !== null && featuredEnd !== null
        ? { startIndex: featuredStart, endIndex: featuredEnd }
        : undefined,
    createdAt: new Date(row['created_at'] as string),
    upvotes: (row['upvote_count'] as number) || 0,
    reactions: DEFAULT_REACTIONS,
    authorId: (row['author_id'] as string | null) || undefined,
    isAnonymous: row['is_anonymous'] as boolean,
    allowTraining: (row['allow_training'] as boolean) ?? true,
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

    return transformDbPost(data as DbRow);
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
