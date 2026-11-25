import { APP_NAME, DEFAULT_LOCALE, t } from "@trailaroo/core";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: t("meta.description"),
    lang: DEFAULT_LOCALE,
    start_url: "/explore", // installed app opens on Explore; the home page is for first visits
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#14110E",
    theme_color: "#14110E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
