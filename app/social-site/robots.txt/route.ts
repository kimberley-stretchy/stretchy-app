// stretchy.social/robots.txt
export function GET() {
  return new Response("User-agent: *\nAllow: /\nSitemap: https://stretchy.social/sitemap.xml\n", { headers: { "Content-Type": "text/plain" } });
}
