import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ReactionType, Reactions } from '@/types';

// Valid reaction types
const VALID_REACTION_TYPES: ReactionType[] = [
  'sparkles',
  'fire',
  'rocket',
  'party',
  'brain',
  'bulb',
  'heart',
  'crying',
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

interface ReactRequest {
  type: string;
}

interface ReactResponse {
  reactions: Reactions;
  userReaction: ReactionType | null;
}

interface ErrorResponse {
  error: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Get user identifier for anonymous reactions
 * Uses IP address or a session-based identifier
 */
function getAnonymousId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return `anon_${ip}`;
}

/**
 * POST /api/posts/[id]/react
 * Add or toggle a reaction on a post
 * Supports both authenticated and anonymous users
 */
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ReactResponse | ErrorResponse>> {
  try {
    const { id: postId } = await params;

    // Parse request body
    let body: ReactRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate reaction type
    const reactionType = body.type as ReactionType;
    if (!reactionType || !VALID_REACTION_TYPES.includes(reactionType)) {
      return NextResponse.json<ErrorResponse>(
        { error: `Invalid reaction type. Valid types: ${VALID_REACTION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get user ID (authenticated or anonymous)
    let userId: string;
    let isAnonymous = true;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
        isAnonymous = false;
      } else {
        userId = getAnonymousId(request);
      }
    } catch {
      // Supabase not configured - use anonymous ID
      userId = getAnonymousId(request);
    }

    // Try to interact with database
    let reactions = { ...DEFAULT_REACTIONS };
    let userReaction: ReactionType | null = null;

    try {
      const supabase = await createClient();

      // Check if post exists
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('id')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        return NextResponse.json<ErrorResponse>(
          { error: 'Post not found' },
          { status: 404 }
        );
      }

      // Check if user already has this reaction
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id, reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('reaction_type', reactionType)
        .single();

      if (existingReaction) {
        // Toggle off - remove the reaction
        await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);
      } else {
        // Add the reaction
        await supabase.from('reactions').insert({
          post_id: postId,
          user_id: userId,
          reaction_type: reactionType,
          is_anonymous: isAnonymous,
        });
        userReaction = reactionType;
      }

      // Get updated reaction counts
      const { data: reactionCounts } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', postId);

      if (reactionCounts) {
        // Count reactions by type
        for (const r of reactionCounts) {
          const type = r.reaction_type as ReactionType;
          if (VALID_REACTION_TYPES.includes(type)) {
            reactions[type]++;
          }
        }
      }

      // Check what reaction the user currently has
      const { data: currentUserReaction } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (currentUserReaction) {
        userReaction = currentUserReaction.reaction_type as ReactionType;
      }
    } catch (dbError) {
      // Database not configured - return simulated success for development
      console.error('Database error (may be expected if Supabase not configured):', dbError);

      // For development, simulate the toggle
      reactions[reactionType] = 1;
      userReaction = reactionType;
    }

    return NextResponse.json<ReactResponse>({
      reactions,
      userReaction,
    });
  } catch (error) {
    console.error('React error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts/[id]/react
 * Get current reaction counts and user's reaction for a post
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<ReactResponse | ErrorResponse>> {
  try {
    const { id: postId } = await params;

    // Get user ID (authenticated or anonymous)
    let userId: string;

    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
      } else {
        userId = getAnonymousId(request);
      }
    } catch {
      userId = getAnonymousId(request);
    }

    let reactions = { ...DEFAULT_REACTIONS };
    let userReaction: ReactionType | null = null;

    try {
      const supabase = await createClient();

      // Get all reaction counts
      const { data: reactionCounts } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', postId);

      if (reactionCounts) {
        for (const r of reactionCounts) {
          const type = r.reaction_type as ReactionType;
          if (VALID_REACTION_TYPES.includes(type)) {
            reactions[type]++;
          }
        }
      }

      // Get user's current reaction
      const { data: currentUserReaction } = await supabase
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (currentUserReaction) {
        userReaction = currentUserReaction.reaction_type as ReactionType;
      }
    } catch {
      // Database not configured - return defaults
    }

    return NextResponse.json<ReactResponse>({
      reactions,
      userReaction,
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
