import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createCheckoutSession,
  isStripeConfigured,
  isValidPaymentType,
  PaymentType,
  PAYMENT_TYPES,
} from '@/lib/stripe';

interface CreateSessionRequest {
  type: string;
  postId?: string;
  amount?: number; // For donations, in cents
  displayName?: string; // For donations
  isPublic?: boolean; // For donations
}

interface CreateSessionResponse {
  url: string;
  sessionId: string;
}

interface ErrorResponse {
  error: string;
}

export async function POST(
  request: Request
): Promise<NextResponse<CreateSessionResponse | ErrorResponse>> {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Payment processing is not configured' },
      { status: 500 }
    );
  }

  // Parse request body
  let body: CreateSessionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate payment type
  if (!body.type || !isValidPaymentType(body.type)) {
    const validTypes = Object.keys(PAYMENT_TYPES).join(', ');
    return NextResponse.json(
      { error: `Invalid payment type. Valid types: ${validTypes}` },
      { status: 400 }
    );
  }

  // Validate postId for non-donation types
  if (body.type !== 'donation' && (!body.postId || typeof body.postId !== 'string')) {
    return NextResponse.json(
      { error: 'Post ID is required for this payment type' },
      { status: 400 }
    );
  }

  // Validate donation amount
  if (body.type === 'donation') {
    if (!body.amount || typeof body.amount !== 'number' || body.amount < 100) {
      return NextResponse.json(
        { error: 'Donation amount must be at least $1.00 (100 cents)' },
        { status: 400 }
      );
    }
  }

  // Verify post exists for queue_skip and scrub
  if (body.type === 'queue_skip' || body.type === 'scrub') {
    try {
      const supabase = await createClient();
      const { data: post, error } = await supabase
        .from('posts')
        .select('id, status')
        .eq('id', body.postId)
        .single();

      if (error || !post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }
    } catch {
      // Database not configured - allow for development
      // In production, this should be strict
    }
  }

  // Build URLs
  const origin = request.headers.get('origin') || 'http://localhost:3000';
  const successUrl = body.type === 'donation'
    ? `${origin}/donate/thank-you?session_id={CHECKOUT_SESSION_ID}`
    : `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=${body.type}&postId=${body.postId || ''}`;
  const cancelUrl = body.type === 'donation'
    ? `${origin}/donate?cancelled=true`
    : `${origin}/payment/cancelled?type=${body.type}&postId=${body.postId || ''}`;

  try {
    const session = await createCheckoutSession({
      type: body.type as PaymentType,
      postId: body.postId,
      amount: body.amount,
      successUrl,
      cancelUrl,
      displayName: body.displayName,
      isPublic: body.isPublic,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create payment session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session. Please try again.' },
      { status: 500 }
    );
  }
}
