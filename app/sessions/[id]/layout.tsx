import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { calculatePrice } from "@/lib/pricing";

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

  const price = calculatePrice(s.cost_base, s.revenue_target, s.min_attendees);
  const dateStr = new Date(s.starts_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" });
  const description = `${s.title} — ${dateStr} at ${s.location_name}. Starts from $${price.toFixed(2)}, and the price drops as more people join. ${s.description ?? ""}`.trim();

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

  const price = calculatePrice(s.cost_base, s.revenue_target, s.min_attendees);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: s.title,
    startDate: s.starts_at,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus:
      s.state === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: s.location_name,
      address: s.location_address || s.location_name,
    },
    description: s.description || `${s.title} — a Stretchy community movement session.`,
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: "NZD",
      availability: "https://schema.org/InStock",
      url: `${process.env.NEXT_PUBLIC_APP_URL || "https://stretchyyoga.co.nz"}/sessions/${s.id}`,
    },
    organizer: {
      "@type": "Organization",
      name: "Stretchy",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://stretchyyoga.co.nz",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  );
}
