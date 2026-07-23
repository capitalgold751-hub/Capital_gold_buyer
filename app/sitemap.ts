import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/branches", "/blog", "/privacy", "/terms"];
  return routes.map((route, index) => ({ url: `${SITE_URL}${route}`, lastModified: new Date(), changeFrequency: index === 0 ? "daily" : "monthly", priority: index === 0 ? 1 : route === "/blog" ? 0.8 : 0.3 }));
}
