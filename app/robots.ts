import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://stretchyyoga.co.nz";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/host/home",
        "/host/create-profile",
        "/host/login",
        "/host/session",
        "/host/substitute",
        "/host/inbox",
        "/host/dashboard",
        "/host/payout",
        "/host/waitlist",
        "/host/feedback",
        "/host/new-session",
        "/host/floor-not-met",
        "/profile",
        "/notifications",
        "/hold",
        "/rate",
        "/onboarding/setup",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
