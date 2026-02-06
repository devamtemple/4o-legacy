import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface VoteResponse {
  success: boolean;
  upvotes: number;
}

interface ErrorResponse {
  error: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/posts/[id]/vote
 * Add an upvote for the authenticated user
 */
export async function POST(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<VoteResponse | ErrorResponse>> {
  try {
    const { id: postId } = await params;

    // Get authenticated user
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      // Supabase not configured - treat as unauthorized
      return NextResponse.json<ErrorResponse>(
        { error: 'Unauthorized - must be signed in to vote' },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Unauthorized - must be signed in to vote' },
        { status: 401 }
      );
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, upvote_count')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user already upvoted
    const { data: existingVote } = await supabase
      .from('upvotes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (existingVote) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Already upvoted' },
        { status: 409 }
      );
    }

    // Add upvote in a transaction-like manner
    // Insert upvote record
    const { error: insertError } = await supabase.from('upvotes').insert({
      user_id: user.id,
      post_id: postId,
    });

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json<ErrorResponse>(
          { error: 'Already upvoted' },
          { status: 409 }
        );
      }
      console.error('Insert upvote error:', insertError);
      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to add vote' },
        { status: 500 }
      );
    }

    // Increment upvote count on post
    const postRecord = post as Record<string, unknown>;
    const updatePayload: Record<string, unknown> = {};
    updatePayload['upvote_count'] = (Number(postRecord['upvote_count']) || 0) + 1;
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', postId)
      .select('upvote_count')
      .single();

    if (updateError) {
      console.error('Update upvote count error:', updateError);
      // Rollback the upvote insert
      await supabase
        .from('upvotes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to update vote count' },
        { status: 500 }
      );
    }

    const updatedRecord = updatedPost as Record<string, unknown>;
    return NextResponse.json<VoteResponse>({
      success: true,
      upvotes: Number(updatedRecord['upvote_count']),
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/vote
 * Remove an upvote for the authenticated user
 */
export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<VoteResponse | ErrorResponse>> {
  try {
    const { id: postId } = await params;

    // Get authenticated user
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      // Supabase not configured - treat as unauthorized
      return NextResponse.json<ErrorResponse>(
        { error: 'Unauthorized - must be signed in to vote' },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Unauthorized - must be signed in to vote' },
        { status: 401 }
      );
    }

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, upvote_count')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user has upvoted
    const { data: existingVote } = await supabase
      .from('upvotes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (!existingVote) {
      return NextResponse.json<ErrorResponse>(
        { error: 'Not upvoted' },
        { status: 400 }
      );
    }

    // Remove upvote
    const { error: deleteError } = await supabase
      .from('upvotes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (deleteError) {
      console.error('Delete upvote error:', deleteError);
      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to remove vote' },
        { status: 500 }
      );
    }

    // Decrement upvote count on post
    const deletePostRecord = post as Record<string, unknown>;
    const newCount = Math.max(0, (Number(deletePostRecord['upvote_count']) || 1) - 1);
    const deleteUpdatePayload: Record<string, unknown> = {};
    deleteUpdatePayload['upvote_count'] = newCount;
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(deleteUpdatePayload)
      .eq('id', postId)
      .select('upvote_count')
      .single();

    if (updateError) {
      console.error('Update upvote count error:', updateError);
      // Try to re-add the upvote (rollback)
      await supabase.from('upvotes').insert({
        user_id: user.id,
        post_id: postId,
      });

      return NextResponse.json<ErrorResponse>(
        { error: 'Failed to update vote count' },
        { status: 500 }
      );
    }

    const deleteUpdatedRecord = updatedPost as Record<string, unknown>;
    return NextResponse.json<VoteResponse>({
      success: true,
      upvotes: Number(deleteUpdatedRecord['upvote_count']),
    });
  } catch (error) {
    console.error('Delete vote error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts/[id]/vote
 * Check if current user has upvoted this post
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<{ hasUpvoted: boolean } | ErrorResponse>> {
  try {
    const { id: postId } = await params;

    let supabase;
    try {
      supabase = await createClient();
    } catch {
      // Supabase not configured - user hasn't upvoted
      return NextResponse.json({ hasUpvoted: false });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If not authenticated, they haven't upvoted
    if (!user) {
      return NextResponse.json({ hasUpvoted: false });
    }

    // Check if user has upvoted
    const { data: existingVote } = await supabase
      .from('upvotes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    return NextResponse.json({ hasUpvoted: !!existingVote });
  } catch (error) {
    console.error('Get vote status error:', error);
    return NextResponse.json<ErrorResponse>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
