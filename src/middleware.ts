import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes that require admin access
const ADMIN_ROUTES = ['/admin', '/api/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if this is an admin route
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // For admin routes, check authentication and admin role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, deny access to admin routes
  if (!supabaseUrl || !supabaseAnonKey) {
    return createForbiddenResponse(request, 'Forbidden - Admin access required');
  }

  // Create Supabase client with cookie handling
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return createForbiddenResponse(request, 'Unauthorized - Please sign in');
  }

  // Check if user is admin by looking at profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return createForbiddenResponse(request, 'Forbidden - Admin access required');
  }

  // User is admin, allow access
  return response;
}

function createForbiddenResponse(request: NextRequest, message: string): NextResponse {
  const { pathname } = request.nextUrl;

  // For API routes, return JSON error
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: message },
      { status: 403 }
    );
  }

  // For pages, redirect to home with error
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.searchParams.set('error', 'admin_required');
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Match admin routes
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
