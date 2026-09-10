import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Middleware is in pass-through mode — auth handled client-side per-page
const PROTECTED_PREFIXES: string[] = [];

const ADMIN_PREFIXES = ["/admin"];

// Site-wide beta gate — while testing, nothing past this cookie check is
// reachable without the shared code entered at /access. Only /access itself
// is exempt (api/* is already outside the matcher below, same as before).
const ACCESS_COOKIE = "stretchy_access";
const ACCESS_GATE_PATH = "/access";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== ACCESS_GATE_PATH) {
    const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value === "granted";
    if (!hasAccess) {
      const gateUrl = new URL(ACCESS_GATE_PATH, request.url);
      gateUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(gateUrl);
    }
  }

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

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
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
