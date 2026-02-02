import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VolunteerRequest, VolunteerResponse, ApiError } from '@/types';

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// In-memory store for development when Supabase is not configured
const inMemoryVolunteers = new Map<string, {
  id: string;
  name: string;
  email: string;
  twitter?: string;
  reason: string;
  status: string;
  createdAt: string;
}>();

export async function POST(
  request: Request
): Promise<NextResponse<VolunteerResponse | ApiError>> {
  try {
    // Parse request body
    let body: VolunteerRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ApiError>(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(body.email.trim())) {
      return NextResponse.json<ApiError>(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (!body.reason || typeof body.reason !== 'string' || !body.reason.trim()) {
      return NextResponse.json<ApiError>(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    const name = body.name.trim().slice(0, 100);
    const email = body.email.trim().toLowerCase().slice(0, 255);
    const twitter = body.twitter?.trim().replace(/^@/, '').slice(0, 50) || null;
    const reason = body.reason.trim().slice(0, 2000);

    // Try to save to database
    let savedToDatabase = false;
    try {
      const supabase = await createClient();

      // Check for existing application with same email
      const { data: existing } = await supabase
        .from('volunteers')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return NextResponse.json<ApiError>(
          { error: 'Already applied' },
          { status: 409 }
        );
      }

      // Insert new application
      const { error: insertError } = await supabase.from('volunteers').insert({
        name,
        email,
        twitter,
        reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        // Check for unique constraint violation
        if (insertError.code === '23505') {
          return NextResponse.json<ApiError>(
            { error: 'Already applied' },
            { status: 409 }
          );
        }
        console.error('Database insert error:', insertError);
      } else {
        savedToDatabase = true;
      }
    } catch (dbError) {
      // Database not configured - use in-memory store
      console.error('Database error (using in-memory fallback):', dbError);

      // Check for existing in-memory
      if (inMemoryVolunteers.has(email)) {
        return NextResponse.json<ApiError>(
          { error: 'Already applied' },
          { status: 409 }
        );
      }

      inMemoryVolunteers.set(email, {
        id: crypto.randomUUID(),
        name,
        email,
        twitter: twitter || undefined,
        reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json<VolunteerResponse>(
      {
        success: true,
        message: 'Application received',
      },
      { status: savedToDatabase ? 201 : 202 }
    );
  } catch (error) {
    console.error('Unexpected error in volunteer route:', error);
    return NextResponse.json<ApiError>(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
