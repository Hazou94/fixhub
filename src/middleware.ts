import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Public routes – no auth required
  if (
    pathname.startsWith("/client/") ||
    pathname.startsWith("/track/") ||
    pathname.startsWith("/evaluate/") ||
    pathname.startsWith("/provider/") ||
    pathname.startsWith("/auth/") ||
    pathname === "/"
  ) {
    return supabaseResponse;
  }

  // Protected hotel routes
  if (pathname.startsWith("/hotel/")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    return supabaseResponse;
  }

  // Super admin routes
  if (pathname.startsWith("/admin/")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    const role = user.user_metadata?.role;
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/hotel/dashboard", request.url));
    }
    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
