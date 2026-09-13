import { SupabaseClient } from "@supabase/supabase-js";
import { HQ_EMAIL, type AttendeeEmailPayload } from "@/lib/stretchy-email";

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
export async function buildSessionEmailExtras(
  admin: SupabaseClient,
  session: SessionForEmail
): Promise<Partial<AttendeeEmailPayload>> {
  const extras: Partial<AttendeeEmailPayload> = {
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
