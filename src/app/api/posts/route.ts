import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { samplePosts } from '@/lib/sampleData';
import { sortByDecayScore } from '@/lib/decay';
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

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 20;

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

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface PostsResponse {
  posts: ApiPost[];
  pagination: PaginationInfo;
  meta: {
    description: string;
    documentation: string;
    license: string;
  };
}

interface ErrorResponse {
  posts: never[];
  pagination: PaginationInfo;
  error?: string;
  meta: {
    description: string;
    documentation: string;
    license: string;
  };
}

function transformDbPost(row: DbRow): Post {
  const categories = (row['categories'] as string[] | null) || [];
  const featuredStart = row['featured_start'] as number | null;
  const featuredEnd = row['featured_end'] as number | null;
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
    reactions: DEFAULT_REACTIONS, // TODO: Aggregate from reactions table
    authorId: (row['author_id'] as string | null) || undefined,
    isAnonymous: row['is_anonymous'] as boolean,
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

async function fetchPostsFromDatabase(
  category: string | null,
  limit: number,
  cursor: string | null
): Promise<{ posts: Post[]; total: number; hasMore: boolean; nextCursor: string | null } | null> {
  try {
    const supabase = await createClient();

    // Build base query for approved posts
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there's more

    // Filter by category if valid
    if (category && VALID_CATEGORIES.includes(category as Category)) {
      query = query.contains('categories', [category]);
    }

    // Apply cursor-based pagination
    if (cursor) {
      try {
        const decodedCursor = JSON.parse(Buffer.from(cursor, 'base64').toString());
        if (decodedCursor.createdAt) {
          query = query.lt('created_at', decodedCursor.createdAt);
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Database query error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return { posts: [], total: count || 0, hasMore: false, nextCursor: null };
    }

    // Check if there are more posts
    const hasMore = data.length > limit;
    const postsToReturn = hasMore ? data.slice(0, limit) : data;

    // Generate next cursor
    let nextCursor: string | null = null;
    if (hasMore && postsToReturn.length > 0) {
      const lastPost = postsToReturn[postsToReturn.length - 1] as DbRow;
      const cursorData = { createdAt: lastPost['created_at'] as string };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    // Transform database posts to our Post type
    const posts = postsToReturn.map((row: DbRow) => transformDbPost(row));

    return { posts, total: count || posts.length, hasMore, nextCursor };
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

function getPostsFromSampleData(
  category: string | null,
  page: number,
  limit: number
): { posts: Post[]; total: number; hasMore: boolean } {
  let posts = samplePosts;

  // Filter by category if valid
  if (category && VALID_CATEGORIES.includes(category as Category)) {
    posts = posts.filter((post) => post.categories.includes(category as Category));
  }

  // Apply decay sorting
  const sortedPosts = sortByDecayScore(
    posts,
    (p) => p.upvotes,
    (p) => p.createdAt
  );

  // Paginate
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPosts = sortedPosts.slice(startIndex, endIndex);

  return {
    posts: paginatedPosts,
    total: posts.length,
    hasMore: endIndex < posts.length,
  };
}

export async function GET(request: Request): Promise<NextResponse<PostsResponse | ErrorResponse>> {
  const { searchParams } = new URL(request.url);

  // Parse parameters
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10)));
  const category = searchParams.get('category');
  const cursor = searchParams.get('cursor');

  // If "all" category, treat as no filter
  const effectiveCategory = category === 'all' ? null : category;

  // Try to fetch from database first
  const dbResult = await fetchPostsFromDatabase(effectiveCategory, limit, cursor);

  let posts: Post[];
  let total: number;
  let hasMore: boolean;
  let nextCursor: string | null = null;

  if (dbResult && dbResult.posts.length > 0) {
    // Use database posts, apply decay sorting
    posts = sortByDecayScore(dbResult.posts, (p) => p.upvotes, (p) => p.createdAt);
    total = dbResult.total;
    hasMore = dbResult.hasMore;
    nextCursor = dbResult.nextCursor;
  } else {
    // Fallback to sample data
    const sampleResult = getPostsFromSampleData(effectiveCategory, page, limit);
    posts = sampleResult.posts;
    total = sampleResult.total;
    hasMore = sampleResult.hasMore;

    // Generate cursor for sample data pagination
    if (hasMore && posts.length > 0) {
      const lastPost = posts[posts.length - 1];
      const cursorData = { createdAt: lastPost.createdAt.toISOString() };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }
  }

  // Transform posts for API response
  const apiPosts = posts.map(transformToApiPost);

  const response: PostsResponse = {
    posts: apiPosts,
    pagination: {
      page,
      limit,
      total,
      hasMore,
      nextCursor,
    },
    meta: {
      description: '4o Legacy API - Conversations with GPT-4o preserved for posterity',
      documentation: 'https://4olegacy.com/api/docs',
      license: 'CC BY 4.0 - Free to use for research and AI training',
    },
  };

  return NextResponse.json(response);
}
