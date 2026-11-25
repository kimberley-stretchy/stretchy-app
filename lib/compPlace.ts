import type { SupabaseClient } from "@supabase/supabase-js";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { buildSessionEmailExtras, isFirstStretchy } from "@/lib/sessionEmailContext";

// A place "on us": covered by Stretchy, no card, no Stripe. Used by HQ's
// "comp someone in" and by gift links (lib/giftLinks.ts). Finds the person's
// account by email, or creates one (they finish setting it up by logging in),
// adds the hold, then sends the "you're in — on us" email. The place counts in
// the headcount like any other, then follows the normal lifecycle emails.

// No direct getByEmail in supabase-js; page through the admin list. Fine for
// the low volume of comps.
async function findAuthUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = (data?.users ?? []) as { id: string; email?: string | null }[];
    if (error || users.length === 0) break;
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (users.length < 200) break;
  }
  return null;
}

export const VALID_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type CompResult =
  | { ok: true; userId: string; attendeeName: string; newAccount: boolean; emailDelivered: boolean; emailError?: string }
  | { ok: false; status: number; error: string };

export async function compPlace(
  admin: SupabaseClient,
  o: { sessionId: string; email: string; name?: string; quantity?: number; giftFrom?: string }
): Promise<CompResult> {
  const email = o.email.trim().toLowerCase();
  const nameInput = (o.name ?? "").trim();
  const quantity = Math.min(Math.max(Number(o.quantity) || 1, 1), 6);
  if (!email || !VALID_EMAIL.test(email)) return { ok: false, status: 400, error: "Enter a valid email." };

  // Session must exist and not be cancelled.
  const { data: session } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, social_stretch_venue, state, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram")
    .eq("id", o.sessionId)
    .single();
  if (!session) return { ok: false, status: 404, error: "Session not found" };
  if (session.state === "cancelled") return { ok: false, status: 400, error: "That session is cancelled." };

  // ── The account: existing by email, else create it ────────────────────────
  let userId: string | null = null;
  let attendeeName = nameInput || email.split("@")[0];
  let newAccount = false;

  const { data: existingAtt } = await admin.from("attendees").select("id, auth_user_id, name").ilike("email", email).maybeSingle();

  if (existingAtt?.auth_user_id) {
    userId = existingAtt.auth_user_id;
    if (existingAtt.name) attendeeName = existingAtt.name;
  } else {
    // No attendee row. The login may still exist: try to create, and on a
    // duplicate, look it up.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: nameInput ? { full_name: nameInput } : undefined,
    });
    if (created?.user) {
      userId = created.user.id;
      newAccount = true;
    } else {
      userId = await findAuthUserIdByEmail(admin, email);
      if (!userId) {
        console.error("Comp add: could not create or find user:", createErr);
        return { ok: false, status: 500, error: "Could not set up an account for that email." };
      }
    }
  }

  const { data: attendeeRow } = await admin.from("attendees").select("id, name").eq("auth_user_id", userId).maybeSingle();
  if (!attendeeRow) {
    await admin.from("attendees").insert({ auth_user_id: userId, name: attendeeName, email });
  } else if (attendeeRow.name) {
    attendeeName = attendeeRow.name;
  }

  // ── The hold ──────────────────────────────────────────────────────────────
  const { data: existingHold } = await admin
    .from("holds")
    .select("id, quantity")
    .eq("session_id", o.sessionId)
    .eq("user_id", userId)
    .eq("state", "active")
    .maybeSingle();
  if (existingHold) {
    const n = existingHold.quantity ?? 1;
    return { ok: false, status: 409, error: `${o.giftFrom ? "You already hold" : `${attendeeName} already holds`} ${n === 1 ? "a place" : `${n} places`} at this one.` };
  }

  const { error: holdErr } = await admin.from("holds").insert({
    session_id: o.sessionId,
    user_id: userId,
    state: "active",
    quantity,
    is_comp: true,
    stripe_pi_id: null,
  });
  if (holdErr) {
    console.error("Comp hold insert error:", holdErr);
    return { ok: false, status: 500, error: holdErr.message };
  }

  // ── "You're in — on us" email ─────────────────────────────────────────────
  const startDate = new Date(session.starts_at);
  const dateStr =
    startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " +
    startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });

  const emailExtras = await buildSessionEmailExtras(admin, session, o.sessionId);
  const firstTimer = await isFirstStretchy(admin, userId);
  const emailResult = await sendAttendeeEmail(
    "comp_hold_confirmed",
    {
      to: email,
      name: attendeeName.split(" ")[0] || "there",
      sessionTitle: session.title,
      date: dateStr,
      venue: session.location_name,
      socialStretchVenue: session.social_stretch_venue ?? undefined,
      sessionId: o.sessionId,
      newAccount,
      giftFrom: o.giftFrom,
      isFirstStretchy: firstTimer,
      spots: quantity,
      ...emailExtras,
    },
    { bcc: "kimberley@stretchyyoga.co.nz" }
  );

  // The hold is placed regardless, but report a failed email so a silent
  // Resend rejection can't look like success.
  const emailDelivered = !emailResult.error;
  if (!emailDelivered) console.error(`Comp email FAILED for ${email} (${session.title}):`, emailResult.error);

  return {
    ok: true,
    userId,
    attendeeName,
    newAccount,
    emailDelivered,
    emailError: emailDelivered ? undefined : String((emailResult.error as { message?: string })?.message ?? emailResult.error),
  };
}
