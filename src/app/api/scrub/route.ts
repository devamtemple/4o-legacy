import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scrubContent, isAnthropicConfigured, ScrubbingOptions } from '@/lib/scrubbing';
import { ChatMessage } from '@/types';

interface ScrubRequest {
  postId: string;
  options?: ScrubbingOptions;
}

interface ScrubResponse {
  success: boolean;
  scrubbedContent: ChatMessage[];
  replacementCount: number;
}

interface ErrorResponse {
  error: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<ScrubResponse | ErrorResponse>> {
  // Check if Anthropic is configured
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { error: 'AI scrubbing service is not configured' },
      { status: 500 }
    );
  }

  // Parse request body
  let body: ScrubRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate postId
  if (!body.postId || typeof body.postId !== 'string') {
    return NextResponse.json(
      { error: 'Post ID is required' },
      { status: 400 }
    );
  }

  // Fetch the post content
  let chat: ChatMessage[];
  let postExists = false;

  try {
    const supabase = await createClient();
    const { data: post, error } = await supabase
      .from('posts')
      .select('id, chat, scrubbed_chat')
      .eq('id', body.postId)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    postExists = true;
    chat = post.chat as ChatMessage[];

    // If already scrubbed, return cached version
    if (post.scrubbed_chat) {
      return NextResponse.json({
        success: true,
        scrubbedContent: post.scrubbed_chat as ChatMessage[],
        replacementCount: 0, // Already processed
      });
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }

  // Scrub the content
  const options: ScrubbingOptions = {
    removeProfanity: body.options?.removeProfanity ?? false,
    removeSexual: body.options?.removeSexual ?? false,
  };

  const result = await scrubContent(chat, options);

  if (!result.success) {
    // Check for specific error types
    if (result.error?.includes('too long')) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    if (result.error?.includes('Rate limit')) {
      return NextResponse.json(
        { error: result.error },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: result.error || 'Scrubbing failed, please try again' },
      { status: 500 }
    );
  }

  // Save the scrubbed version to database
  if (postExists) {
    try {
      const supabase = await createClient();
      await supabase
        .from('posts')
        .update({
          scrubbed_chat: result.scrubbedContent,
          scrubbed_at: new Date().toISOString(),
          needs_scrubbing: false,
        })
        .eq('id', body.postId);
    } catch (error) {
      console.error('Failed to save scrubbed content:', error);
      // Don't fail the request, just log the error
    }
  }

  return NextResponse.json({
    success: true,
    scrubbedContent: result.scrubbedContent,
    replacementCount: result.replacements.length,
  });
}
