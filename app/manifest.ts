import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Capital Gold Buyers",
    short_name: "Capital Gold",
    description: "Check gold rates, estimate value and request a branch appointment.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    prefer_related_applications: false,
    background_color: "#070b12",
    theme_color: "#070b12",
    orientation: "portrait-primary",
    categories: ["business", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Check Gold Rate", short_name: "Rates", url: "/#rates", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Book Appointment", short_name: "Book", url: "/#appointment", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
