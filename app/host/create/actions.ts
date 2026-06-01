"use server";

import { createClient } from "@/lib/supabase/server";
import { startingPrice, floorPrice, STRETCHY_FEE } from "@/lib/pricing";
import type { SessionType } from "@/types";

export interface CreateSessionInput {
  sessionType: SessionType;
  title: string;
  description: string;
  durationMinutes: number;
  date: string;        // "YYYY-MM-DD"
  time: string;        // "HH:MM"
  neighbourhood: string;
  venueName: string;
  venueNotes: string;
  hasSocialStretch: boolean;
  hostTarget: number;
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

  // ── 3. Build the starts_at timestamp ──────────────────────────────────────
  const startsAt = new Date(`${input.date}T${input.time}:00`).toISOString();

  // ── 4. Insert session ──────────────────────────────────────────────────────
  // Note: charity fields not yet in schema — stored in description for now
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
      session_type: input.sessionType,
      duration_minutes: input.durationMinutes,
      starts_at: startsAt,
      neighbourhood: input.neighbourhood,
      venue_name: input.venueName.trim(),
      venue_address: input.venueName.trim(), // full address can be added later
      venue_notes: input.venueNotes.trim() || null,
      host_target: input.hostTarget,
      stretchy_fee: STRETCHY_FEE,
      minimum_spots: input.minimumSpots,
      max_capacity: input.maxCapacity,
      current_holds: 0,
      confirmed_spots: 0,
      status: "open",
      phase: "HOLD_BELOW_MIN",
      has_social_stretch: input.hasSocialStretch,
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
