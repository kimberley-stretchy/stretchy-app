// stretchy.social/sitemap.xml — a one-page site.
export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://stretchy.social/</loc><changefreq>weekly</changefreq></url></urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
