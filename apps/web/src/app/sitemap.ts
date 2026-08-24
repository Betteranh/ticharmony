import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

// Public, indexable pages only — the authenticated app and the login page
// are excluded from robots.ts and have no place in the sitemap either.
const PUBLIC_PATHS: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const urlFor = (locale: string, path: string) => `${SITE_URL}/${locale}${path}`;

  return PUBLIC_PATHS.flatMap(({ path, priority, changeFrequency }) =>
    routing.locales.map((locale) => ({
      url: urlFor(locale, path),
      lastModified: new Date(),
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, urlFor(l, path)]),
        ),
      },
    })),
  );
}
