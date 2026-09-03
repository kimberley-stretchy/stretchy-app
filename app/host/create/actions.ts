"use server";

import { createClient } from "@/lib/supabase/server";
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

  // ── 1. Get authenticated user ──────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated. Please log in first." };
  }

  // ── 2. Look up their host record ───────────────────────────────────────────
  const { data: host, error: hostError } = await supabase
    .from("hosts")
    .select("id, vetting_status")
    .eq("auth_user_id", user.id)
    .single();

  if (hostError || !host) {
    return {
      success: false,
      error:
        "No host profile found. Please complete your host application first.",
    };
  }

  // Allow pending hosts to create sessions for testing
  // In production you'd check: host.vetting_status === 'approved'

  // ── 3. Build the starts_at / ends_at timestamps ────────────────────────────
  const startsAt = new Date(`${input.date}T${input.time}:00`);
  const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60 * 1000);

  // ── 4. Insert session ──────────────────────────────────────────────────────
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
