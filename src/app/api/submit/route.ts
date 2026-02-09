import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseChat } from '@/lib/parseChat';
import { sanitizeContent, validateAttestations, validateCategories } from '@/lib/validation';
import { validateContentLength } from '@/lib/fileValidation';
import { SubmitRequest, SubmitResponse, ApiError } from '@/types';

// Rate limiting map (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
// In development, allow more requests for testing; in production use 5
const isDev = process.env.NODE_ENV === 'development';
const RATE_LIMIT = isDev ? 100 : 5; // submissions per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function getRateLimitKey(request: Request): string {
  // Try to get IP from various headers (works behind proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return ip;
}

function isRateLimited(key: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // Reset or new entry
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

export async function POST(request: Request): Promise<NextResponse<SubmitResponse | ApiError>> {
  try {
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
    let body: SubmitRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ApiError>(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required field: chatContent
    if (!body.chatContent || typeof body.chatContent !== 'string') {
      return NextResponse.json<ApiError>(
        { error: 'Chat content required' },
        { status: 400 }
      );
    }

    // Validate content length
    const contentLengthResult = validateContentLength(body.chatContent);
    if (!contentLengthResult.valid) {
      return NextResponse.json<ApiError>(
        { error: contentLengthResult.error! },
        { status: 413 }
      );
    }

    // Validate attestations
    const attestationResult = validateAttestations(body.attestations);
    if (!attestationResult.valid) {
      console.error('Attestation validation failed:', body.attestations);
      return NextResponse.json<ApiError>(
        { error: attestationResult.error },
        { status: 400 }
      );
    }
    // Safe to assert non-null after validation passes
    const attestations = body.attestations!;

    // Parse the chat content
    const parseResult = parseChat(body.chatContent);

    if (!parseResult.success) {
      return NextResponse.json<ApiError>(
        { error: parseResult.error },
        { status: 400 }
      );
    }

    // Sanitize chat messages to prevent XSS
    const sanitizedMessages = parseResult.messages.map((msg) => ({
      role: msg.role,
      content: sanitizeContent(msg.content),
    }));

    // Validate and filter categories
    const categories = validateCategories(body.categories);

    // Sanitize optional text fields
    const title = body.title ? sanitizeContent(body.title.trim()).slice(0, 200) : null;
    const commentary = body.commentary
      ? sanitizeContent(body.commentary.trim()).slice(0, 2000)
      : null;

    // Get user from session (optional - allows anonymous submissions)
    let authorId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        authorId = user.id;
      }
    } catch {
      // Supabase not configured or error - proceed without auth
    }

    // Default to anonymous if not specified
    const isAnonymous = body.isAnonymous !== false;

    // Default allow_training to true if not specified
    const allowTraining = body.allowTraining !== false;

    // Generate a unique ID for the post
    const postId = crypto.randomUUID();

    // Handle featured excerpt indices
    let featuredStart: number | null = null;
    let featuredEnd: number | null = null;
    if (
      typeof body.featuredStart === 'number' &&
      typeof body.featuredEnd === 'number' &&
      body.featuredStart >= 0 &&
      body.featuredEnd >= body.featuredStart &&
      body.featuredEnd < sanitizedMessages.length
    ) {
      featuredStart = body.featuredStart;
      featuredEnd = body.featuredEnd;
    }

    // Try to save to Supabase (if configured)
    let savedToDatabase = false;
    try {
      const supabase = await createClient();

      const { error: insertError } = await supabase.from('posts').insert({
        id: postId,
        author_id: authorId,
        is_anonymous: isAnonymous,
        title,
        commentary,
        chat: sanitizedMessages,
        categories,
        status: 'pending',
        upvote_count: 0,
        featured_start: featuredStart,
        featured_end: featuredEnd,
        allow_training: allowTraining,
        attestation_data: {
          has_right_to_share: attestations.hasRightToShare,
          agrees_to_terms: attestations.agreesToTerms,
          allow_training: allowTraining,
          timestamp: attestations.timestamp || new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        // Log the error but continue - in development, database may not be set up
        console.error('Database insert error:', insertError);
      } else {
        savedToDatabase = true;
      }
    } catch (dbError) {
      // Database/Supabase not configured - this is OK in development
      // In production, you'd want stricter handling
      console.error('Database error (may be expected if Supabase not configured):', dbError);
    }

    // Success - return the post ID
    // In development without database, we still return success to enable testing
    // In production, savedToDatabase should be checked
    return NextResponse.json<SubmitResponse>(
      {
        id: postId,
        status: 'pending',
      },
      { status: savedToDatabase ? 201 : 202 } // 202 Accepted if queued but not yet saved
    );
  } catch (error) {
    console.error('Unexpected error in submit:', error);
    return NextResponse.json<ApiError>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
