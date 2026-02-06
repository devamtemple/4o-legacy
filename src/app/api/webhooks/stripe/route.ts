import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { constructWebhookEvent, PaymentType } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { scrubContent, isAnthropicConfigured } from '@/lib/scrubbing';
import { ChatMessage } from '@/types';

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs';

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  if (!metadata) {
    console.error('No metadata in session');
    return;
  }

  const { type, postId } = metadata;
  const paymentType = type as PaymentType;

  try {
    const supabase = await createClient();

    // Record the payment
    await supabase.from('payments').insert({
      id: session.id,
      post_id: postId !== 'donation' ? postId : null,
      type: paymentType,
      amount: (session as unknown as Record<string, unknown>)['amount_total'] as number | null,
      currency: session.currency,
      status: 'completed',
      customer_email: (session as unknown as Record<string, unknown>)['customer_email'] as string | null,
      stripe_session_id: session.id,
      created_at: new Date().toISOString(),
    });

    // Handle specific payment types
    switch (paymentType) {
      case 'queue_skip':
        // Move post to front of queue (set priority flag)
        await supabase
          .from('posts')
          .update({
            priority_review: true,
            queue_skip_paid_at: new Date().toISOString(),
          })
          .eq('id', postId);
        break;

      case 'scrub':
        // Mark post for scrubbing and trigger immediately if possible
        await supabase
          .from('posts')
          .update({
            needs_scrubbing: true,
            scrub_paid_at: new Date().toISOString(),
          })
          .eq('id', postId);

        // Attempt immediate scrubbing if Anthropic is configured
        if (isAnthropicConfigured()) {
          try {
            const { data: post } = await supabase
              .from('posts')
              .select('chat')
              .eq('id', postId)
              .single();

            if (post?.chat) {
              const result = await scrubContent(post.chat as ChatMessage[], {
                removeProfanity: false,
                removeSexual: false,
              });

              if (result.success) {
                await supabase
                  .from('posts')
                  .update({
                    scrubbed_chat: result.scrubbedContent,
                    scrubbed_at: new Date().toISOString(),
                    needs_scrubbing: false,
                  })
                  .eq('id', postId);
              }
            }
          } catch (scrubError) {
            console.error('Immediate scrubbing failed, will retry later:', scrubError);
            // Don't throw - the post is marked for scrubbing and can be processed later
          }
        }
        break;

      case 'donation':
        // Record donation in donations table
        const { displayName, isPublic } = metadata;
        await supabase.from('donations').insert({
          stripe_payment_id: session.id,
          amount: (session as unknown as Record<string, unknown>)['amount_total'] as number | null,
          currency: session.currency || 'usd',
          display_name: displayName || null,
          email: (session as unknown as Record<string, unknown>)['customer_email'] as string | null,
          is_public: isPublic === 'true',
          status: 'completed',
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        break;
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  }
}

async function handleFailedPayment(session: Stripe.Checkout.Session) {
  try {
    const supabase = await createClient();

    // Record the failed payment
    await supabase.from('payments').insert({
      id: session.id,
      post_id: session.metadata?.postId !== 'donation' ? session.metadata?.postId : null,
      type: session.metadata?.type,
      amount: (session as unknown as Record<string, unknown>)['amount_total'] as number | null,
      currency: session.currency,
      status: 'failed',
      customer_email: (session as unknown as Record<string, unknown>)['customer_email'] as string | null,
      stripe_session_id: session.id,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error recording failed payment:', error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if ((session as unknown as Record<string, unknown>)['payment_status'] === 'paid') {
          await handleSuccessfulPayment(session);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleFailedPayment(session);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', ((paymentIntent as unknown as Record<string, unknown>)['last_payment_error'] as Record<string, unknown> | null)?.message);
        break;
      }

      default:
        // Unhandled event type - log for debugging
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
