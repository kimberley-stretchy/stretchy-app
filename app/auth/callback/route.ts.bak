import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchy.social";

  if (code) {
    // Build the redirect response first so we can attach cookies to it
    const response = NextResponse.redirect(`${appUrl}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          // Read cookies from the incoming request (where the PKCE verifier lives)
          getAll() {
            return request.cookies.getAll();
          },
          // Write cookies onto the outgoing response (to save the session)
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }

    console.error("Auth callback error:", error.message);
  }

  return NextResponse.redirect(`${appUrl}/login?error=auth_failed`);
}
