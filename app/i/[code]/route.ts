import { NextRequest, NextResponse } from "next/server";
import { INVITE_COOKIE, INVITE_COOKIE_DAYS, cleanCode } from "@/lib/invites";

// stretchyyoga.co.nz/i/{code} — someone's personal invite link. Remembers the
// code for 30 days (so their first place held counts towards the inviter),
// then shows what's on. The welcome card for invited people comes later
// (SOCIAL_BOOKING_BRIEF.md section 3).
export function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const res = NextResponse.redirect(new URL("/sessions", request.url));
  const code = cleanCode(params.code);
  if (code) {
    res.cookies.set(INVITE_COOKIE, code, {
      maxAge: INVITE_COOKIE_DAYS * 86_400,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
  return res;
}
