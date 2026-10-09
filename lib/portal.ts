// Team portal — shared types + field lists for /admin/portal and /host/portal.
// Tables: lib/supabase/migrations/2026-10-09_team_portal.sql

export type PortalLocation = {
  id: string;
  name: string;
  sort_order: number;
  schedule_day: string | null;
  access_time: string | null;
  class_time: string | null;
  yoga_venue_name: string | null;
  yoga_venue_address: string | null;
  yoga_venue_phone: string | null;
  yoga_venue_email: string | null;
  yoga_venue_website: string | null;
  yoga_contact_name: string | null;
  yoga_contact_email: string | null;
  yoga_contact_phone: string | null;
  yoga_notes: string | null;
  social_venue_name: string | null;
  social_venue_address: string | null;
  social_venue_phone: string | null;
  social_venue_email: string | null;
  social_contact_name: string | null;
  social_contact_email: string | null;
  social_contact_phone: string | null;
  social_notes: string | null;
  access_codes: string | null;
  alarm_codes: string | null;
  security_company: string | null;
  security_phone: string | null;
  weekly_instructions: string | null;
  updated_at?: string;
};

export type PortalPerson = {
  id: string;
  name: string;
  preferred_name: string | null;
  role: "owner" | "hq" | "teacher" | "gem" | "partner" | "other";
  role_label: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  tiktok: string | null;
  other_handles: string | null;
  on_all_locations: boolean;
  sort_order: number;
  location_ids: string[];
};

export type PortalAgreement = {
  id: string;
  version: number;
  title: string;
  body: string;          // everyone
  body_teacher: string;
  body_gem: string;
  body_partner: string;
  published_at: string | null;
  updated_at?: string;
};

export const ROLE_LABELS: Record<PortalPerson["role"], string> = {
  owner: "Owner",
  hq: "HQ",
  teacher: "Teacher",
  gem: "GEM",
  partner: "Partner",
  other: "Other",
};

export type AgreementKey = "body" | "body_teacher" | "body_gem" | "body_partner";
export const AGREEMENT_SECTIONS: { key: AgreementKey; title: string; role?: PortalPerson["role"] }[] = [
  { key: "body", title: "For everyone" },
  { key: "body_teacher", title: "For teachers", role: "teacher" },
  { key: "body_gem", title: "For GEMs", role: "gem" },
  { key: "body_partner", title: "For partners", role: "partner" },
];

type Field = { key: keyof PortalLocation; label: string; multiline?: boolean; secret?: boolean };
export type FieldGroup = { title: string; emoji: string; fields: Field[]; secret?: boolean };

// The editable location fields, grouped the way they're shown on both pages.
export const LOCATION_GROUPS: FieldGroup[] = [
  {
    title: "Schedule", emoji: "🗓",
    fields: [
      { key: "schedule_day", label: "Day" },
      { key: "access_time", label: "Access from" },
      { key: "class_time", label: "Class" },
    ],
  },
  {
    title: "Yoga venue", emoji: "🧘",
    fields: [
      { key: "yoga_venue_name", label: "Venue" },
      { key: "yoga_venue_address", label: "Address" },
      { key: "yoga_venue_phone", label: "Phone" },
      { key: "yoga_venue_email", label: "Email" },
      { key: "yoga_venue_website", label: "Website" },
      { key: "yoga_contact_name", label: "Contact person" },
      { key: "yoga_contact_email", label: "Contact email" },
      { key: "yoga_contact_phone", label: "Contact phone" },
      { key: "yoga_notes", label: "Notes", multiline: true },
    ],
  },
  {
    title: "Social Stretch", emoji: "🌞",
    fields: [
      { key: "social_venue_name", label: "Venue" },
      { key: "social_venue_address", label: "Address" },
      { key: "social_venue_phone", label: "Phone" },
      { key: "social_venue_email", label: "Email" },
      { key: "social_contact_name", label: "Contact person" },
      { key: "social_contact_email", label: "Contact email" },
      { key: "social_contact_phone", label: "Contact phone" },
      { key: "social_notes", label: "Notes", multiline: true },
    ],
  },
  {
    title: "Access & security", emoji: "🔐", secret: true,
    fields: [
      { key: "access_codes", label: "Access codes", multiline: true, secret: true },
      { key: "alarm_codes", label: "Alarm codes", multiline: true, secret: true },
      { key: "security_company", label: "Security company", secret: true },
      { key: "security_phone", label: "Security phone", secret: true },
    ],
  },
  {
    title: "Each week", emoji: "📋", secret: true,
    fields: [{ key: "weekly_instructions", label: "Instructions", multiline: true, secret: true }],
  },
];

export const LOCATION_FIELDS = ["name", "sort_order", ...LOCATION_GROUPS.flatMap((g) => g.fields.map((f) => f.key))] as const;
export const SECRET_LOCATION_FIELDS = LOCATION_GROUPS.flatMap((g) => g.fields.filter((f) => f.secret).map((f) => f.key));

export const PERSON_FIELDS = [
  "name", "preferred_name", "role", "role_label", "email", "phone",
  "instagram", "tiktok", "other_handles", "on_all_locations", "sort_order",
] as const;

// Keep only whitelisted keys; blank strings become null.
export function pick<T extends string>(src: Record<string, unknown>, keys: readonly T[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (!(k in src)) continue;
    const v = src[k];
    out[k] = typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v;
  }
  return out;
}

export function peopleForLocation(people: PortalPerson[], locationId: string) {
  return people
    .filter((p) => p.on_all_locations || p.location_ids.includes(locationId))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}
