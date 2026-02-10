import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeContent } from '@/lib/validation';

interface ContactRequest {
  name?: string;
  email?: string;
  message: string;
}

interface ContactResponse {
  success: boolean;
}

interface ContactError {
  error: string;
}

// Rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const isDev = process.env.NODE_ENV === 'development';
const RATE_LIMIT = isDev ? 100 : 3; // messages per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

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

export async function POST(
  request: Request
): Promise<NextResponse<ContactResponse | ContactError>> {
  try {
    // Rate limiting
    const rateLimitKey = getRateLimitKey(request);
    const rateLimit = isRateLimited(rateLimitKey);

    if (rateLimit.limited) {
      return NextResponse.json<ContactError>(
        { error: 'Too many messages. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfter) },
        }
      );
    }

    // Parse body
    let body: ContactRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ContactError>(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    // Validate message
    const message = body.message?.trim();
    if (!message || message.length < 10) {
      return NextResponse.json<ContactError>(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json<ContactError>(
        { error: 'Message must be under 5000 characters' },
        { status: 400 }
      );
    }

    // Validate email format if provided
    const email = body.email?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json<ContactError>(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedMessage = sanitizeContent(message).slice(0, 5000);
    const sanitizedName = body.name ? sanitizeContent(body.name.trim()).slice(0, 100) : null;
    const sanitizedEmail = email ? sanitizeContent(email).slice(0, 254) : null;

    // Store in database
    const supabase = await createClient();
    const ipAddress = getRateLimitKey(request);

    const { error: insertError } = await supabase.from('contact_messages').insert({
      name: sanitizedName,
      email: sanitizedEmail,
      message: sanitizedMessage,
      ip_address: ipAddress,
    });

    if (insertError) {
      console.error('Contact message insert error:', insertError);
      return NextResponse.json<ContactError>(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json<ContactResponse>({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json<ContactError>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
