import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { moderateSubmission } from '@/lib/gemini';
import type { ChatMessage } from '@/types';

export async function POST(request: Request) {
  // Verify internal secret
  const secret = request.headers.get('x-moderate-secret');
  if (!secret || secret !== process.env.MODERATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { postId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch the post
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, chat, categories, content_warnings, ai_reviewed_at')
    .eq('id', body.postId)
    .single();

  if (fetchError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  // Destructure DB columns to camelCase
  const aiReviewedAt = (post as Record<string, unknown>)['ai_reviewed_at'];
  const contentWarnings = ((post as Record<string, unknown>)['content_warnings'] as string[]) || [];

  // Skip if already moderated
  if (aiReviewedAt) {
    return NextResponse.json({ skipped: true, message: 'Already moderated' }, { status: 200 });
  }

  // Run AI moderation
  const messages = post.chat as ChatMessage[];
  let result;
  try {
    result = await moderateSubmission(messages);
  } catch (error) {
    console.error('Moderation failed for post', body.postId, error);
    return NextResponse.json(
      { error: `Moderation failed: ${error instanceof Error ? error.message : 'unknown error'}` },
      { status: 200 }
    );
  }

  // Determine status based on decision and confidence
  let newStatus: string;
  if (result.decision === 'reject') {
    newStatus = 'rejected';
  } else if (result.decision === 'approve' && result.confidence >= 0.85) {
    newStatus = 'approved';
  } else {
    newStatus = 'pending';
  }

  // Merge categories: user-chosen + AI-suggested, deduped
  const existingCategories = (post.categories as string[]) || [];
  const mergedCategories = [...new Set([...existingCategories, ...result.suggestedCategories])];

  // Merge content warnings: user-provided + AI-detected, deduped
  const mergedWarnings = [...new Set([...contentWarnings, ...result.detectedWarnings])];

  // Update post with moderation results
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      status: newStatus,
      scrubbed_chat: result.scrubbedMessages,
      ai_moderation_result: result,
      ai_confidence: result.confidence,
      ai_reviewed_at: new Date().toISOString(),
      content_warnings: mergedWarnings,
      categories: mergedCategories,
    })
    .eq('id', body.postId);

  if (updateError) {
    console.error('Failed to update post after moderation:', updateError);
    return NextResponse.json({ error: 'Failed to save moderation result' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    postId: body.postId,
    decision: result.decision,
    confidence: result.confidence,
    status: newStatus,
  });
}
