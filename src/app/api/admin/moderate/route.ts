import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PostStatus } from '@/types';

interface ModerateRequest {
  postId: string;
  action: 'approve' | 'reject' | 'flag';
  reason?: string;
}

interface ModerateResponse {
  success: boolean;
  postId: string;
  newStatus: PostStatus;
}

interface ErrorResponse {
  error: string;
}

const ACTION_TO_STATUS: Record<string, PostStatus> = {
  approve: 'approved',
  reject: 'rejected',
  flag: 'flagged',
};

export async function POST(
  request: Request
): Promise<NextResponse<ModerateResponse | ErrorResponse>> {
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

    // Parse request body
    let body: ModerateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    // Validate request
    if (!body.postId || typeof body.postId !== 'string') {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    if (!body.action || !['approve', 'reject', 'flag'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, or flag' },
        { status: 400 }
      );
    }

    // Rejection requires a reason
    if (body.action === 'reject' && (!body.reason || body.reason.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, status')
      .eq('id', body.postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const newStatus = ACTION_TO_STATUS[body.action];

    // Update post status
    const { error: updateError } = await supabase
      .from('posts')
      .update({ status: newStatus })
      .eq('id', body.postId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update post status' }, { status: 500 });
    }

    // Log moderation action
    const { error: logError } = await supabase.from('moderation_log').insert({
      post_id: body.postId,
      moderator_id: user.id,
      action: body.action,
      reason: body.reason || null,
      previous_status: post.status,
      new_status: newStatus,
      created_at: new Date().toISOString(),
    });

    if (logError) {
      // Log error but don't fail the request - moderation action succeeded
      console.error('Failed to log moderation action:', logError);
    }

    return NextResponse.json({
      success: true,
      postId: body.postId,
      newStatus,
    });
  } catch (error) {
    console.error('Moderation error:', error);
    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
  }
}
