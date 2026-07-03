import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://quickpanel360.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["es", "en", "nl"];
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1 },
  ];

  for (const locale of locales) {
    pages.push({
      url: `${BASE}/${locale}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }

  pages.push(
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  );

  return pages;
}
