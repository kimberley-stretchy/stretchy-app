import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Middleware is in pass-through mode — auth handled client-side per-page
const PROTECTED_PREFIXES: string[] = [];

const ADMIN_PREFIXES = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public routes through immediately. /admin also needs the auth+role
  // check below — it was previously unreachable because PROTECTED_PREFIXES
  // was empty, silently disabling the admin redirect this file appears to do.
  const needsAdminCheck = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const needsAuth = needsAdminCheck || PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { session }, error } = await supabase.auth.getSession();

  if (!session) {
    // Temporary diagnostic logging — remove once the /admin session-not-
    // recognized bug is root-caused. Logs cookie names present (not values)
    // and any Supabase error so we can see server-side why getSession()
    // failed despite a cookie being sent.
    console.log(
      "[middleware] no session for", pathname,
      "cookieNames:", request.cookies.getAll().map((c) => c.name),
      "error:", error?.message ?? null
    );
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes — check role in user metadata
  const needsAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  if (needsAdmin) {
    const role = session.user?.user_metadata?.role ?? session.user?.app_metadata?.role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/home?error=not_authorised", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
  ],
};
