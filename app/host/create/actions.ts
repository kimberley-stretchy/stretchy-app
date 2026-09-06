"use server";

import { createClient } from "@/lib/supabase/server";
import { requireHost } from "@/lib/hostAuth";
import type { MovementType } from "@/types";

export interface CreateSessionInput {
  sessionType: MovementType;
  title: string;
  description: string;
  durationMinutes: number;
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM"
  neighbourhood: string;
  venueName: string;
  venueNotes: string;
  hasSocialStretch: boolean;
  costBase: number;
  revenueTarget: number;
  minimumSpots: number;
  maxCapacity: number;
  isCharity: boolean;
  charityName: string;
  charityWebsite: string;
  charityInstagram: string;
  charityNote: string;
}

export interface CreateSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export async function createSession(
  input: CreateSessionInput
): Promise<CreateSessionResult> {
  const supabase = createClient();

  // ── 1. Auth + approved-host + MFA gate ─────────────────────────────────────
  // This also closes a prior gap where any pending (unapproved) host could
  // create real sessions — requireHost() enforces vetting_status === "approved".
  const gate = await requireHost();
  if ("error" in gate) {
    const body = await gate.error.json();
    return { success: false, error: body.error };
  }
  const { host } = gate;

  // ── 2. Build the starts_at / ends_at timestamps ────────────────────────────
  const startsAt = new Date(`${input.date}T${input.time}:00`);
  const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60 * 1000);

  // ── 3. Insert session ──────────────────────────────────────────────────────
  // Note: there's no dedicated charity column yet — fold it into the description.
  const descriptionWithCharity =
    input.isCharity && input.charityName
      ? `${input.description.trim()}\n\n🎗️ Fundraiser for ${input.charityName}${input.charityNote ? `: ${input.charityNote}` : ""}`.trim()
      : input.description.trim() || null;

  const { data: session, error: insertError } = await supabase
    .from("sessions")
    .insert({
      host_id: host.id,
      title: input.title.trim(),
      description: descriptionWithCharity,
      movement_type: input.sessionType,
      duration_mins: input.durationMinutes,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      location_name: input.venueName.trim(),
      // There's no separate neighbourhood column — fold it into the address.
      location_address: input.neighbourhood || null,
      getting_there: input.venueNotes.trim() || null,
      cost_base: input.costBase,
      revenue_target: input.revenueTarget,
      min_attendees: input.minimumSpots,
      max_attendees: input.maxCapacity,
      state: "open",
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Session insert error:", insertError);
    return {
      success: false,
      error: `Failed to create session: ${insertError.message}`,
    };
  }

  return { success: true, sessionId: session.id };
}
