// Single source of truth for the public site origin, used to build absolute
// URLs for metadataBase, hreflang alternates, robots.txt and sitemap.xml.
// Falls back to localhost in development; set NEXT_PUBLIC_SITE_URL to the
// real production domain once IT4U is deployed.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
