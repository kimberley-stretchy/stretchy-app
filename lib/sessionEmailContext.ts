import { SupabaseClient } from "@supabase/supabase-js";
import { HQ_EMAIL, type AttendeeEmailPayload } from "@/lib/stretchy-email";
import { styleAndLevel } from "@/lib/sessionDisplay";

// Turns the raw session/movement fields into the extra bits the attendee email
// templates want (teacher name + style + handle, GEM name + handle, venue
// handles, duration, directions). One place so every send is consistent.

const MOVEMENT_LABELS: Record<string, string> = {
  yoga: "Yoga",
  pilates: "Pilates",
  breathwork: "Breathwork",
  sound_bath: "Sound bath",
  run_club: "Run club",
  hiit: "HIIT",
  dance: "Dance",
  other: "Movement",
};

export function movementLabel(type?: string | null): string {
  if (!type) return "Movement";
  return MOVEMENT_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

// Normalise an Instagram value to an @handle for display (leaves full URLs alone).
function handle(value?: string | null): string | undefined {
  const v = (value ?? "").trim();
  if (!v) return undefined;
  if (v.startsWith("http")) return v;
  return v.startsWith("@") ? v : `@${v.replace(/^@+/, "")}`;
}

export interface SessionForEmail {
  host_id?: string | null;
  gem_host_id?: string | null;
  movement_type?: string | null;
  duration_mins?: number | null;
  getting_there?: string | null;
  venue_instagram?: string | null;
  social_venue_instagram?: string | null;
}

// Look up teacher + GEM names/handles and assemble the shared email fields.
// Skips the auto-provisioned HQ placeholder host (unassigned sessions default
// to Kimberley's record) so we don't wrongly print "with Kimberley Torrie".
//
// Pass `sessionId` when the result feeds an attendee email: the refreshed emails
// draw everything (dates, times, people dots, prices, "Bring with you") from the
// session itself, so this reads the full row and the live headcount once here
// rather than every caller having to select the right columns.
export async function buildSessionEmailExtras(
  admin: SupabaseClient,
  session: SessionForEmail,
  sessionId?: string
): Promise<Partial<AttendeeEmailPayload>> {
  const facts: Partial<AttendeeEmailPayload> = {};
  if (sessionId) {
    const [{ data: row }, { data: holds }] = await Promise.all([
      admin.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
      admin.from("holds").select("quantity").eq("session_id", sessionId).eq("state", "active"),
    ]);
    if (row) {
      const { style, level } = styleAndLevel(row.description, row.movement_type);
      Object.assign(facts, {
        startsAt: row.starts_at ?? undefined,
        durationMins: row.duration_mins ?? undefined,
        minAttendees: row.min_attendees ?? undefined,
        maxAttendees: row.max_attendees ?? undefined,
        costBase: row.cost_base ?? undefined,
        revenueTarget: row.revenue_target ?? undefined,
        sessionState: row.state ?? undefined,
        locationAddress: row.location_address ?? undefined,
        styleLine: style,
        level: level ?? undefined,
        // HQ's new bold line; until a session has one, its older what-to-bring text.
        bringTitle: (row.bring_title ?? "").trim() || (Array.isArray(row.what_to_bring) ? row.what_to_bring.filter(Boolean)[0] : undefined) || undefined,
        bringNote: row.bring_note ?? undefined,
        held: (holds ?? []).reduce((sum: number, h: { quantity: number | null }) => sum + (h.quantity ?? 1), 0),
      } satisfies Partial<AttendeeEmailPayload>);
    }
  }

  const extras: Partial<AttendeeEmailPayload> = {
    ...facts,
    teacherStyle: movementLabel(session.movement_type),
    durationLabel: session.duration_mins ? `${session.duration_mins} min` : undefined,
    directions: session.getting_there ?? undefined,
    venueHandle: handle(session.venue_instagram),
    socialVenueHandle: handle(session.social_venue_instagram),
  };

  const ids = [session.host_id, session.gem_host_id].filter(Boolean) as string[];
  if (ids.length > 0) {
    const { data: hosts } = await admin.from("hosts").select("id, name, email, instagram").in("id", ids);
    const byId = new Map((hosts ?? []).map((h) => [h.id, h]));

    const teacher = session.host_id ? byId.get(session.host_id) : undefined;
    if (teacher && teacher.email !== HQ_EMAIL) {
      extras.teacherName = teacher.name ?? undefined;
      extras.teacherHandle = handle(teacher.instagram);
    }
    const gem = session.gem_host_id ? byId.get(session.gem_host_id) : undefined;
    if (gem) {
      extras.gemName = gem.name ?? undefined;
      extras.gemHandle = handle(gem.instagram);
    }
  }

  return extras;
}

// First Stretchy = no previously-charged hold for this user.
export async function isFirstStretchy(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { count } = await admin
    .from("holds")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("state", "charged");
  return (count ?? 0) === 0;
}
