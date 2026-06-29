import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push-server";

export async function POST(request: NextRequest) {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  await sendPushToUser(user.id, {
    title: "Stretchy push test 🧘",
    body: "Push notifications are working! You'll get these at 36h and 2h before sessions.",
    url: "/sessions",
  });

  return NextResponse.json({ ok: true });
}
