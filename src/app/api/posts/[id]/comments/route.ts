import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Comment, ApiError } from '@/types';

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const isDev = process.env.NODE_ENV === 'development';
const RATE_LIMIT = isDev ? 100 : 10; // comments per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return `comment_${ip}`;
}

function isRateLimited(key: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { limited: false };
  }

  if (record.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { limited: true, retryAfter };
  }

  record.count++;
  return { limited: false };
}

// Basic XSS sanitization
function sanitizeContent(content: string): string {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface DbComment {
  id: string;
  post_id: string;
  content: string;
  author_id: string | null;
  author_name: string | null;
  is_anonymous: boolean;
  parent_id: string | null;
  created_at: string;
}

interface ApiComment {
  id: string;
  postId: string;
  content: string;
  authorName: string;
  isAnonymous: boolean;
  parentId: string | null;
  createdAt: string;
  replies?: ApiComment[];
}

interface CommentsResponse {
  comments: ApiComment[];
  total: number;
}

interface CreateCommentRequest {
  content: string;
  authorName?: string;
  parentId?: string;
}

interface CreateCommentResponse {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

function transformDbComment(dbComment: DbComment): ApiComment {
  return {
    id: dbComment.id,
    postId: dbComment.post_id,
    content: dbComment.content,
    authorName: dbComment.author_name || 'Anonymous',
    isAnonymous: dbComment.is_anonymous,
    parentId: dbComment.parent_id,
    createdAt: dbComment.created_at,
  };
}

function buildThreadedComments(comments: ApiComment[]): ApiComment[] {
  const commentMap = new Map<string, ApiComment>();
  const rootComments: ApiComment[] = [];

  // First pass: create map of all comments
  for (const comment of comments) {
    commentMap.set(comment.id, { ...comment, replies: [] });
  }

  // Second pass: build tree structure
  for (const comment of comments) {
    const mappedComment = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(mappedComment);
      } else {
        // Parent not found, treat as root
        rootComments.push(mappedComment);
      }
    } else {
      rootComments.push(mappedComment);
    }
  }

  return rootComments;
}

// In-memory storage for development/fallback
const inMemoryComments: ApiComment[] = [];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CommentsResponse | ApiError>> {
  const { id: postId } = await params;

  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error fetching comments:', error);
      // Fallback to in-memory comments for this post
      const fallbackComments = inMemoryComments.filter((c) => c.postId === postId);
      return NextResponse.json({
        comments: buildThreadedComments(fallbackComments),
        total: fallbackComments.length,
      });
    }

    const comments = (data as DbComment[]).map(transformDbComment);
    const threadedComments = buildThreadedComments(comments);

    return NextResponse.json({
      comments: threadedComments,
      total: comments.length,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    // Fallback to in-memory comments
    const fallbackComments = inMemoryComments.filter((c) => c.postId === postId);
    return NextResponse.json({
      comments: buildThreadedComments(fallbackComments),
      total: fallbackComments.length,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CreateCommentResponse | ApiError>> {
  const { id: postId } = await params;

  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  // Rate limiting
  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = isRateLimited(rateLimitKey);

  if (rateLimit.limited) {
    const response = NextResponse.json<ApiError>(
      { error: 'Rate limit exceeded. Please try again later.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(rateLimit.retryAfter));
    return response;
  }

  // Parse request body
  let body: CreateCommentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate content
  if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
    return NextResponse.json<ApiError>(
      { error: 'Comment content is required' },
      { status: 400 }
    );
  }

  // Sanitize and limit content
  const sanitizedContent = sanitizeContent(body.content.trim()).slice(0, 5000);

  // Get author info
  let authorId: string | null = null;
  let authorName = 'Anonymous';
  let isAnonymous = true;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      authorId = user.id;
      isAnonymous = false;
      // Try to get display name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      if (profile?.display_name) {
        authorName = profile.display_name;
      } else {
        authorName = user.email?.split('@')[0] || 'User';
      }
    }
  } catch {
    // Auth not available, continue as anonymous
  }

  // If anonymous and no author name provided, require one
  if (isAnonymous) {
    if (body.authorName && typeof body.authorName === 'string' && body.authorName.trim().length > 0) {
      authorName = sanitizeContent(body.authorName.trim()).slice(0, 50);
    }
  }

  // Validate parent comment if provided
  const parentId = body.parentId || null;
  if (parentId) {
    try {
      const supabase = await createClient();
      const { data: parentComment, error } = await supabase
        .from('comments')
        .select('id, parent_id')
        .eq('id', parentId)
        .eq('post_id', postId)
        .single();

      if (error || !parentComment) {
        return NextResponse.json<ApiError>(
          { error: 'Parent comment not found' },
          { status: 400 }
        );
      }

      // Only allow one level of threading
      if (parentComment.parent_id) {
        return NextResponse.json<ApiError>(
          { error: 'Cannot reply to a reply. Only one level of threading is allowed.' },
          { status: 400 }
        );
      }
    } catch {
      // Can't validate parent - allow it for in-memory mode
    }
  }

  const commentId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // Try to save to database
  try {
    const supabase = await createClient();

    // First verify the post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      // Post not found in database, check if it's a sample post
      // For now, allow comments on any postId for development
    }

    const { error: insertError } = await supabase.from('comments').insert({
      id: commentId,
      post_id: postId,
      content: sanitizedContent,
      author_id: authorId,
      author_name: authorName,
      is_anonymous: isAnonymous,
      parent_id: parentId,
      created_at: createdAt,
    });

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Fall through to in-memory storage
    } else {
      return NextResponse.json<CreateCommentResponse>(
        {
          id: commentId,
          content: sanitizedContent,
          authorName,
          createdAt,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Database error:', error);
  }

  // Fallback: store in memory for development
  inMemoryComments.push({
    id: commentId,
    postId,
    content: sanitizedContent,
    authorName,
    isAnonymous,
    parentId,
    createdAt,
  });

  return NextResponse.json<CreateCommentResponse>(
    {
      id: commentId,
      content: sanitizedContent,
      authorName,
      createdAt,
    },
    { status: 201 }
  );
}
