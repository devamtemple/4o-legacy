import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FlagRequest, FlagResponse, ApiError, FlagReason } from '@/types';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // flags per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

// Valid flag reasons
const VALID_REASONS: FlagReason[] = [
  'spam',
  'fake',
  'malicious',
  'contains-pii',
  'disrespectful',
  'other',
];

// Auto-flag threshold
const AUTO_FLAG_THRESHOLD = 3;

function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
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

// In-memory store for development when Supabase is not configured
const inMemoryFlags = new Map<string, { postId: string; reason: string; details?: string; ip: string }[]>();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<FlagResponse | ApiError>> {
  try {
    const { id: postId } = await params;

    // Rate limiting
    const ip = getRateLimitKey(request);
    const rateLimit = isRateLimited(ip);

    if (rateLimit.limited) {
      const response = NextResponse.json<ApiError>(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
      response.headers.set('Retry-After', String(rateLimit.retryAfter));
      return response;
    }

    // Parse request body
    let body: FlagRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ApiError>(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate reason
    if (!body.reason || !VALID_REASONS.includes(body.reason)) {
      return NextResponse.json<ApiError>(
        { error: 'Invalid flag reason' },
        { status: 400 }
      );
    }

    // Validate details for 'other' reason
    if (body.reason === 'other' && (!body.details || !body.details.trim())) {
      return NextResponse.json<ApiError>(
        { error: 'Details required for "other" reason' },
        { status: 400 }
      );
    }

    // Try to get user from session
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch {
      // Supabase not configured - continue without auth
    }

    // Try to save to database
    let flagCount = 1;
    let savedToDatabase = false;

    try {
      const supabase = await createClient();

      // Check if post exists
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id, status')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        return NextResponse.json<ApiError>(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      // Check for existing flag from this user/IP
      let existingFlagQuery = supabase
        .from('flags')
        .select('id')
        .eq('post_id', postId);

      if (userId) {
        existingFlagQuery = existingFlagQuery.eq('user_id', userId);
      } else {
        existingFlagQuery = existingFlagQuery.eq('ip_address', ip);
      }

      const { data: existingFlag } = await existingFlagQuery.single();

      if (existingFlag) {
        // Update existing flag
        const updateData: Record<string, unknown> = {
          reason: body.reason,
          updated_at: new Date().toISOString(),
        };
        if (body.details) {
          updateData.details = body.details.trim().slice(0, 500);
        }

        await supabase
          .from('flags')
          .update(updateData)
          .eq('id', existingFlag.id);
      } else {
        // Insert new flag
        const insertData: Record<string, unknown> = {
          post_id: postId,
          reason: body.reason,
          created_at: new Date().toISOString(),
        };

        if (userId) {
          insertData.user_id = userId;
        } else {
          insertData.ip_address = ip;
        }

        if (body.details) {
          insertData.details = body.details.trim().slice(0, 500);
        }

        const { error: insertError } = await supabase
          .from('flags')
          .insert(insertData);

        if (insertError) {
          console.error('Flag insert error:', insertError);
        }
      }

      // Get updated flag count
      const { count } = await supabase
        .from('flags')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      flagCount = count || 1;
      savedToDatabase = true;

      // Auto-flag post if threshold reached
      if (flagCount >= AUTO_FLAG_THRESHOLD && post.status === 'approved') {
        await supabase
          .from('posts')
          .update({ status: 'flagged' })
          .eq('id', postId);
      }
    } catch (dbError) {
      // Database not configured - use in-memory store
      console.error('Database error (using in-memory fallback):', dbError);

      const postFlags = inMemoryFlags.get(postId) || [];
      const existingIndex = postFlags.findIndex(f => f.ip === ip);

      if (existingIndex >= 0) {
        postFlags[existingIndex] = {
          postId,
          reason: body.reason,
          details: body.details,
          ip,
        };
      } else {
        postFlags.push({
          postId,
          reason: body.reason,
          details: body.details,
          ip,
        });
      }

      inMemoryFlags.set(postId, postFlags);
      flagCount = postFlags.length;
    }

    return NextResponse.json<FlagResponse>(
      {
        success: true,
        flagCount,
      },
      { status: savedToDatabase ? 200 : 202 }
    );
  } catch (error) {
    console.error('Unexpected error in flag route:', error);
    return NextResponse.json<ApiError>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
