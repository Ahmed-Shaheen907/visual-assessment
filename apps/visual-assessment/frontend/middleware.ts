import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Public routes — always accessible
  if (pathname.startsWith('/auth')) {
    return supabaseResponse;
  }

  // Unauthenticated users go to login
  if (!user) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Admin account goes straight to admin dashboard; block them from game routes
  const ADMIN_EMAIL = 'manager@gmail.com';
  if (user.email === ADMIN_EMAIL) {
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|tgl-logo\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
