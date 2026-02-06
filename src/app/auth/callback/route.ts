import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Handle OAuth errors
  if (errorParam) {
    const loginUrl = new URL('/auth/login', requestUrl.origin);
    loginUrl.searchParams.set('error', errorDescription || 'OAuth authentication failed');
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL('/auth/login', requestUrl.origin);
      loginUrl.searchParams.set('error', 'Authentication failed');
      return NextResponse.redirect(loginUrl);
    }

    // Redirect to home page with welcome flag for new users
    const homeUrl = new URL('/', requestUrl.origin);
    homeUrl.searchParams.set('welcome', 'true');
    return NextResponse.redirect(homeUrl);
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/auth/login', requestUrl.origin));
}
