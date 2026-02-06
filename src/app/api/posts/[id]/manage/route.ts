import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ErrorResponse {
  error: string;
}

interface SuccessResponse {
  success: boolean;
}

type DbRow = Record<string, unknown>;

// PATCH /api/posts/[id]/manage — toggle allow_training
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the post belongs to this user
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id, allow_training')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postRow = post as DbRow;
    if (postRow['author_id'] !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse the request body for the new allow_training value
    let body: { allowTraining?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (typeof body.allowTraining !== 'boolean') {
      return NextResponse.json(
        { error: 'allowTraining must be a boolean' },
        { status: 400 }
      );
    }

    // Update the post
    const { error: updateError } = await supabase
      .from('posts')
      .update({ allow_training: body.allowTraining })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Manage PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/posts/[id]/manage — delete a post
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the post belongs to this user
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('author_id, allow_training')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postRow = post as DbRow;
    if (postRow['author_id'] !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allowTraining = postRow['allow_training'] as boolean;

    if (allowTraining) {
      // Soft delete for training-opted-in posts so archive can be notified
      const { error: updateError } = await supabase
        .from('posts')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (updateError) {
        console.error('Soft delete error:', updateError);
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
      }
    } else {
      // Hard delete for display-only posts
      const { error: deleteError } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Hard delete error:', deleteError);
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Manage DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
