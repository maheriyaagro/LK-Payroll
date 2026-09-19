// middleware.ts
// Route protection middleware enforcing session and organization onboarding rules.
// Rules:
// 1. No session -> redirect to /login
// 2. Session with no org -> redirect to /onboarding
// 3. Session with org visiting /login, /signup, or /onboarding -> redirect to / (dashboard)

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Exclude static assets, api routes, and icons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return response;
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://szbuuaropvszwhibmben.supabase.co';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_WwJxaTofGPcCcYpqrGdaCQ_pWxMDNNm';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Check user session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  const isAuthRoute = pathname === '/login' || pathname === '/signup';
  const isOnboardingRoute = pathname === '/onboarding';

  // 1. No session: Redirect protected routes to /login
  if (!user || userError) {
    if (!isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 2. Authenticated user: Check organization membership
  const { data: member } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const hasOrg = !!member?.org_id;

  // Session with no organization -> redirect to /onboarding
  if (!hasOrg) {
    if (!isOnboardingRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Session with existing organization -> redirect away from auth and onboarding to dashboard
  if (hasOrg && (isAuthRoute || isOnboardingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
