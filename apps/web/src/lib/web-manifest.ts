import type { MetadataRoute } from "next";
import type { AppConfig } from "next-intl";
import type { Locale } from "@/i18n/locales";

/** One install identity, with launch language and copy from the current locale. */
export const createWebManifest = (
  locale: Locale,
  copy: Pick<AppConfig["Messages"]["general"]["meta"], "title" | "description">,
  screenshotLabel: string,
): MetadataRoute.Manifest => {
  return {
    id: "/",
    lang: locale,
    name: copy.title,
    short_name: "ecentic",
    description: copy.description,
    start_url: locale === "en" ? "/" : `/${locale}`,
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#1a1a1a",
    theme_color: "#1572fa",
    categories: ["business", "productivity", "shopping"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/dashboard.png",
        label: screenshotLabel,
        sizes: "1280x720",
        type: "image/png",
      },
    ],
  };
};
