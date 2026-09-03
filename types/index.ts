// ─── MOVEMENT TYPE ──────────────────────────────────────────────────────────
// Matches the live `movement_type` Postgres enum exactly.

export type MovementType =
  | "yoga"
  | "pilates"
  | "breath"
  | "sound"
  | "flow"
  | "run"
  | "hiit";

/** @deprecated use MovementType — kept as an alias so existing imports still work. */
export type SessionType = MovementType;

// ─── SESSION STATE / PHASE ──────────────────────────────────────────────────

/** Matches the live `session_state` Postgres enum exactly. */
export type SessionState = "open" | "confirmed" | "cancelled" | "completed" | "locked";

/** UI-derived phase — computed client-side from timing + holds, not stored directly. */
export type SessionPhase =
  | "HOLD_BELOW_MIN"   // open, not enough mats held yet
  | "HOLD_DROPPING"    // minimum reached, price dropping in real-time
  | "CONFIRMED"        // post-36hr check, confirmed, still dropping
  | "LOCKED"           // 2hrs before, price frozen, payment processing
  | "COMPLETED"        // session ran
  | "CANCELLED";       // minimum not met at 36hr check

// ─── SESSION ────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  host_id: string;
  host?: Host;                 // joined
  title: string;
  description?: string;
  movement_type: MovementType;
  starts_at: string;           // ISO datetime
  ends_at?: string;
  duration_mins?: number;
  location_name: string;
  location_address?: string;
  getting_there?: string;
  cost_base: number;           // what it costs Stretchy to run the session
  revenue_target: number;      // what the session is aiming to net on top
  currency: string;            // ISO 4217, e.g. "NZD"
  min_attendees: number;       // minimum mats
  max_attendees: number;       // maximum mats
  state: SessionState;
  current_holds?: number;      // derived — count of holds where state = 'active'
  social_stretch_venue?: string;
  social_stretch_note?: string;
  what_to_bring?: string[];
  confirmed_at?: string;
  cancelled_at?: string;
  locked_at?: string;
  host_paid_at?: string;
  created_at: string;
}

// ─── HOST ───────────────────────────────────────────────────────────────────

export type VettingStatus = "pending" | "approved" | "declined" | "more_info" | "expired";

export interface Host {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  neighbourhood: string;
  practice_types: MovementType[];
  years_experience?: number;
  is_certified: boolean;
  has_first_aid: boolean;
  instagram?: string;
  tiktok?: string;
  website?: string;
  substack?: string;
  bank_account_added: boolean;
  stripe_account_id?: string;
  sessions_hosted: number;
  rating_average?: number;
  rating_count: number;
  vetting_status: VettingStatus;
  vetting_expires_at?: string;
  application_notes?: string;
  created_at: string;
}

// ─── ATTENDEE ───────────────────────────────────────────────────────────────

export interface Attendee {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  neighbourhood?: string;
  stripe_customer_id?: string;
  stripe_pm_id?: string;        // saved at first hold, charged at lock-in
  sessions_attended: number;
  notification_email: boolean;
  notification_sms: boolean;
  notification_push: boolean;
  created_at: string;
}

// ─── HOLD ───────────────────────────────────────────────────────────────────

/** Matches the live `hold_state` Postgres enum exactly. */
export type HoldState = "active" | "released" | "charged" | "refunded" | "payment_failed" | "confirmed";

export interface Hold {
  id: string;
  session_id: string;
  user_id: string;              // references auth.users.id directly
  attendee?: Attendee;          // joined via user_id -> attendees.auth_user_id
  state: HoldState;
  stripe_pi_id?: string;
  amount_charged_nzd?: number;  // final amount charged at lock-in, in cents
  created_at: string;
}

// ─── PRICING ─────────────────────────────────────────────────────────────────

export interface PricingState {
  startingPrice: number;        // ceiling — most anyone pays (price at minimumMats)
  currentPrice: number;         // live price right now
  floorPrice: number;           // price if maximumMats reached
  nextPrice: number;            // price if one more person joins
  costBase: number;
  revenueTarget: number;
  minimumMats: number;
  maximumMats: number;
  peopleHolding: number;
  pricePercentDrop: number;     // how far from ceiling to floor we've come
  matsUntilMin: number;         // how many more needed to go ahead
  phase: SessionPhase;
  currency: string;
}

export interface PriceCurvePoint {
  spots: number;
  price: number;
  isCurrent?: boolean;
  isMin?: boolean;
  isMax?: boolean;
}

// ─── NOTIFICATION ───────────────────────────────────────────────────────────

export type NotificationType =
  | "DROPPING"        // minimum just hit, price started dropping
  | "CONFIRMED"       // going ahead post-36hr
  | "UPDATE"          // price dropped
  | "ACTION"          // rate this session
  | "ALMOST_FULL"     // scarcity nudge
  | "CANCELLED"       // session didn't go ahead
  | "LOCKED"          // price locked, payment processing
  | "PAYOUT";         // host payout incoming

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  session_id?: string;
  session?: Session;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ─── SUGGESTION ─────────────────────────────────────────────────────────────

export interface Suggestion {
  id: string;
  suggested_by_id: string;
  session_type: MovementType;
  preferred_time?: string;
  preferred_neighbourhood?: string;
  notes?: string;
  vote_count: number;
  has_voted?: boolean;
  created_at: string;
}

// ─── RATING ─────────────────────────────────────────────────────────────────

export interface Rating {
  id: string;
  session_id: string;
  attendee_id?: string;
  host_id?: string;
  stars: number;
  vibe_chips: VibeChip[];
  note_to_host?: string;
  photo_urls?: string[];
  consent_given: boolean;
  created_at: string;
}

export type VibeChip =
  | "strong_flow"
  | "welcoming"
  | "great_music"
  | "good_cues"
  | "punctual"
  | "felt_connection"
  | "loved_social_stretch"
  | "other";
