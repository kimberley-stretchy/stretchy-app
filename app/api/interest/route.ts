import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const VALID_TYPES = ["social_stretch", "teacher", "gem", "venue", "partner"];

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, name, email, fields } = body;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid submission type" }, { status: 400 });
  }

  const admin = getAdmin();
  const { error } = await admin.from("interest_submissions").insert({
    type,
    name: name || null,
    email: email || null,
    fields: fields || {},
  });

  if (error) {
    console.error("Interest submission error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
