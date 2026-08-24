import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

// The authenticated app (dashboard, tickets, assets, directory, users,
// knowledge-base) sits behind login and has no crawlable value — disallowing
// it here is defense-in-depth, not the only thing keeping it out of results.
const DISALLOWED_APP_PATHS = [
  "dashboard",
  "assets",
  "directory",
  "knowledge-base",
  "users",
];

export default function robots(): MetadataRoute.Robots {
  // Every locale is served under its own prefix (/fr, /en) — there is no
  // unprefixed content page to disallow separately, "/" only redirects.
  const disallow = ["/api/"];
  for (const locale of routing.locales) {
    const prefix = `/${locale}`;
    for (const path of DISALLOWED_APP_PATHS) {
      disallow.push(`${prefix}/${path}`, `${prefix}/${path}/`);
    }
    disallow.push(`${prefix}/login`);
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
