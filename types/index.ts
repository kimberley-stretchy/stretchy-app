// ─── PRICING ────────────────────────────────────────────────────────────────

export type SessionPhase =
  | "HOLD_BELOW_MIN"   // open, not enough holds yet
  | "HOLD_DROPPING"    // minimum reached, price dropping in real-time
  | "CONFIRMED"        // post-24hr check, confirmed, still dropping
  | "LOCKED"           // 2hrs before, price frozen, payment processing
  | "COMPLETED"        // session ran
  | "CANCELLED";       // minimum not met at 24hr check

export type SessionStatus =
  | "open"         // pink — accepting holds, below minimum
  | "dropping"     // yellow — minimum hit, price dropping
  | "filling"      // deep yellow — ≥75% full
  | "almost_full"  // hot pink — ≥80%, scarcity trigger
  | "confirmed"    // green — post-24hr confirmed
  | "full"
  | "cancelled";

// ─── SESSION ────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  title: string;
  host: Host;
  host_id: string;
  description: string;
  session_type: SessionType;
  duration_minutes: number;
  starts_at: string;           // ISO datetime
  neighbourhood: string;
  venue_name: string;
  venue_address: string;
  venue_notes?: string;
  max_capacity: number;
  minimum_spots: number;
  host_target: number;         // NZD, what the host needs to earn
  current_holds: number;
  confirmed_spots: number;
  phase: SessionPhase;
  status: SessionStatus;
  social_stretch_venue?: string;
  social_stretch_details?: string;
  is_repeat: boolean;
  repeat_frequency?: "weekly" | "fortnightly" | "monthly";
  created_at: string;
  confirmed_at?: string;
  locked_at?: string;
  cancelled_at?: string;
}

export type SessionType =
  | "yoga"
  | "pilates"
  | "run_club"
  | "breathwork"
  | "sound_bath"
  | "dance"
  | "hiit"
  | "other";

// ─── HOST ───────────────────────────────────────────────────────────────────

export interface Host {
  id: string;
  name: string;
  avatar_url?: string;
  bio?: string;
  neighbourhood: string;
  practice_type: SessionType[];
  years_experience?: number;
  is_certified: boolean;
  has_first_aid: boolean;
  instagram?: string;
  tiktok?: string;
  website?: string;
  substack?: string;
  sessions_hosted: number;
  rating_average?: number;
  rating_count: number;
  vetting_expires_at: string;
  bank_account_added: boolean;
}

// ─── ATTENDEE ───────────────────────────────────────────────────────────────

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  neighbourhood?: string;
  stripe_customer_id?: string;
  payment_method_id?: string;   // saved at onboarding, charged at lock-in
  sessions_attended: number;
  notification_email: boolean;
  notification_sms: boolean;
  notification_push: boolean;
  created_at: string;
}

// ─── HOLD ───────────────────────────────────────────────────────────────────

export interface Hold {
  id: string;
  session_id: string;
  attendee_id: string;
  attendee: Attendee;
  price_at_hold: number;        // starting price when they joined
  price_paid?: number;          // final price charged at lock-in
  notes_for_host?: string;      // injuries, pregnancy etc.
  status: "held" | "confirmed" | "cancelled" | "charged" | "refunded";
  created_at: string;
  confirmed_at?: string;
  charged_at?: string;
}

// ─── PRICING ─────────────────────────────────────────────────────────────────

export interface PricingState {
  startingPrice: number;        // ceiling — most anyone pays
  currentPrice: number;         // live price right now
  floorPrice: number;           // price if max capacity reached
  stretchyFee: number;          // $20 + GST = $23 NZD
  hostTarget: number;
  minimumSpots: number;
  currentSpots: number;         // holds or confirmed
  maxCapacity: number;
  pricePercentDrop: number;     // how far from ceiling to floor we've come
  spotsUntilMin: number;        // how many more needed to confirm
  phase: SessionPhase;
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
  | "CONFIRMED"       // going ahead post-24hr
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
  session_type: SessionType;
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
  attendee_id: string;
  stars: number;
  vibe_chips: VibeChip[];
  note_to_host?: string;
  photo_urls?: string[];
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
