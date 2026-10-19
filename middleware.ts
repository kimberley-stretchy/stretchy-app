import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Middleware is in pass-through mode — auth handled client-side per-page
const PROTECTED_PREFIXES: string[] = [];

const ADMIN_PREFIXES = ["/admin"];

// The site-wide beta gate (/access + stretchy_access cookie) is retired —
// the site is public. Old /access links just bounce to where they were headed.
const ACCESS_GATE_PATH = "/access";

// stretchy.social — the Stretchy platform for other businesses, teachers and
// organisations — is served from this same app. Its pages live under
// /social-site; on the stretchy.social address they appear at the top level
// (stretchy.social/ → /social-site). On stretchyyoga.co.nz that folder isn't
// shown; it sends people to stretchy.social instead. Previews and local
// development can open /social-site directly.
const SOCIAL_HOSTS = new Set(["stretchy.social", "www.stretchy.social"]);
const MAIN_HOSTS = new Set(["stretchyyoga.co.nz", "www.stretchyyoga.co.nz"]);
const SOCIAL_PREFIX = "/social-site";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (SOCIAL_HOSTS.has(host)) {
    // Files (fonts, images, the share card) are shared with the main site and
    // load as they are; robots.txt and sitemap.xml are stretchy.social's own.
    const isFile = /\.[a-z0-9]+$/i.test(pathname) && pathname !== "/robots.txt" && pathname !== "/sitemap.xml";
    if (isFile || pathname.startsWith("/_next")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith(SOCIAL_PREFIX) ? pathname : `${SOCIAL_PREFIX}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  if (MAIN_HOSTS.has(host) && (pathname === SOCIAL_PREFIX || pathname.startsWith(`${SOCIAL_PREFIX}/`))) {
    return NextResponse.redirect(new URL(pathname.slice(SOCIAL_PREFIX.length) || "/", "https://stretchy.social"));
  }

  if (pathname === ACCESS_GATE_PATH) {
    const next = request.nextUrl.searchParams.get("next");
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return NextResponse.redirect(new URL(dest, request.url));
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
