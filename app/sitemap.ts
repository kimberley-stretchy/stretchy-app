import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://stretchyyoga.co.nz";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/sessions`, changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${base}/suggest`, changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${base}/faq`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${base}/host/apply`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${base}/gem/apply`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${base}/venue/offer`, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${base}/partner`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${base}/social-stretch/add`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${base}/vision`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/store`, changeFrequency: "monthly" as const, priority: 0.2 },
  ].map((r) => ({ ...r, lastModified: new Date() }));

  const admin = getAdmin();
  const { data: sessions } = await admin
    .from("sessions")
    .select("id")
    .in("state", ["open", "confirmed"])
    .eq("is_draft", false)
    .gt("starts_at", new Date().toISOString());

  const sessionRoutes: MetadataRoute.Sitemap = (sessions ?? []).map((s) => ({
    url: `${base}/sessions/${s.id}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...sessionRoutes];
}
