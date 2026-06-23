import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Stretchy Auth Middleware
 *
 * Protects routes that require authentication or specific roles.
 *
 * Route rules:
 *   /admin/*   → must be authenticated + have role = "admin" in user metadata
 *   /host/*    → must be authenticated (any role)
 *   /profile   → must be authenticated
 *   /onboarding → must be authenticated
 *   /sessions/* → must be authenticated (hold + detail screens)
 *
 * Public routes (no auth required):
 *   /          → landing page
 *   /login     → login / magic link
 *   /sessions  → browse sessions list (read-only)
 *
 * NOTE: Until Supabase is connected, the middleware runs in BYPASS mode —
 * all requests pass through. Set NEXT_PUBLIC_SUPABASE_URL to activate.
 */

// Routes that require the user to be logged in
const PROTECTED_PREFIXES = [
  "/admin",
  "/host",
  "/profile",
  "/onboarding",
  "/hold",
  "/rate",
  "/social-stretch",
  "/notifications",
];

// Routes that only admins can access
const ADMIN_PREFIXES = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Redirect www → non-www so auth cookies always share the same domain ──
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("www.")) {
    const url = request.nextUrl.clone();
    url.host = host.replace(/^www\./, "");
    return NextResponse.redirect(url, 301);
  }

  // ── DEMO MODE: let everyone through for testing ───────────────────────────
  // Remove this line when auth is ready for real users.
  return NextResponse.next();

  // ── Check if this route needs protection ─────────────────────────────────
  const needsAuth = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (!needsAuth) return NextResponse.next();

  // ── Create Supabase server client ─────────────────────────────────────────
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Get session ───────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not logged in → redirect to login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Admin route check ─────────────────────────────────────────────────────
  const needsAdmin = ADMIN_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (needsAdmin) {
    // Role is stored in user_metadata when you create/update the user via Supabase Admin SDK
    // e.g.: supabase.auth.admin.updateUserById(userId, { user_metadata: { role: "admin" } })
    const role = user.user_metadata?.role;

    if (role !== "admin") {
      // Authenticated but not admin — send to home with an error param
      const homeUrl = new URL("/home", request.url);
      homeUrl.searchParams.set("error", "not_authorised");
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run middleware on all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - Public assets (svg, png, jpg, etc.)
     * - API routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/).*)",
  ],
};
