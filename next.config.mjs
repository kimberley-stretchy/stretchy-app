/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  // Old Squarespace URLs (from before the move to this app) — customers may
  // have them bookmarked or in old posts, so send them somewhere useful
  // instead of a 404. /contact and /home already exist here.
  async redirects() {
    return [
      { source: "/about-stretchy", destination: "/vision", permanent: true },
      { source: "/about-stretchy-1", destination: "/vision", permanent: true },
      { source: "/book-your-spot", destination: "/sessions", permanent: true },
      { source: "/events", destination: "/sessions", permanent: true },
      { source: "/meetups", destination: "/sessions", permanent: true },
      { source: "/yinner", destination: "/sessions", permanent: true },
      { source: "/stretchy-events-corporate-private", destination: "/contact", permanent: true },
      { source: "/stretchy-store", destination: "/store", permanent: true },
      { source: "/stretchy-store/:path*", destination: "/store", permanent: true },
      { source: "/cart", destination: "/store", permanent: true },
      { source: "/link-in-bio", destination: "/", permanent: true },
      { source: "/search", destination: "/", permanent: true },
      { source: "/account", destination: "/profile", permanent: true },
      { source: "/account/:path*", destination: "/profile", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
