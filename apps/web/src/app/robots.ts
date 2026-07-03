import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://quickpanel360.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/es", "/en", "/nl", "/privacy", "/terms"],
        disallow: ["/dashboard", "/pos", "/cash", "/members", "/products", "/chat", "/settings", "/security", "/platform", "/api", "/login"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
