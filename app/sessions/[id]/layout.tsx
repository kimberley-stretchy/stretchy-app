import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { offerSchema, priceSentence } from "@/lib/searchPricing";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getSession(id: string) {
  const admin = getAdmin();
  const { data } = await admin
    .from("sessions")
    .select("id, title, description, movement_type, starts_at, duration_mins, location_name, location_address, cost_base, revenue_target, min_attendees, max_attendees, state")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getSession(id);
  if (!s) return { title: "Session — Stretchy" };

  const dateStr = new Date(s.starts_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" });
  // Never "starts from": search and AI tools repeat it as a starting price.
  const description = `${s.title} — ${dateStr} at ${(s.location_name ?? "").trim()}. ${priceSentence(s)}${s.description ? ` ${s.description.trim()}.` : ""}`;

  return {
    title: `${s.title} — Stretchy`,
    description,
    openGraph: {
      title: `${s.title} — Stretchy`,
      description,
      type: "website",
    },
  };
}

export default async function SessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const s = await getSession(id);

  if (!s) return children;

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.stretchyyoga.co.nz";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: s.title,
    startDate: s.starts_at,
    ...(s.duration_mins ? { endDate: new Date(new Date(s.starts_at).getTime() + s.duration_mins * 60_000).toISOString() } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus:
      s.state === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: (s.location_name ?? "").trim(),
      address: s.location_address || s.location_name,
    },
    description: `${s.description ? `${s.description.trim()}.` : `${s.title}: a Stretchy community yoga session in Auckland, with a Social Stretch after.`} ${priceSentence(s)}`,
    // A price RANGE (full room → the most you'll pay), so search and AI tools
    // don't quote the maximum as a "from" price.
    offers: offerSchema(s, `${base}/sessions/${s.id}`),
    organizer: {
      "@type": "Organization",
      name: "Stretchy Yoga",
      url: base,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
