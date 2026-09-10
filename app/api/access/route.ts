import { NextRequest, NextResponse } from "next/server";

// POST /api/access — the site-wide beta gate. Not gated itself (excluded
// from middleware's matcher, same as every /api/* route), otherwise nobody
// could ever submit the code in the first place.
export async function POST(request: NextRequest) {
  const { code } = await request.json();
  const expected = process.env.SITE_ACCESS_CODE;

  if (!expected) {
    console.error("SITE_ACCESS_CODE is not set — the access gate can't validate anything.");
    return NextResponse.json({ error: "Access isn't configured yet — contact kimberley@stretchyyoga.co.nz." }, { status: 500 });
  }

  if (typeof code !== "string" || code.trim().toUpperCase() !== expected.trim().toUpperCase()) {
    return NextResponse.json({ error: "That code doesn't look right." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("stretchy_access", "granted", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 60, // 60 days
    path: "/",
  });
  return res;
}
