import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "Best AI Tools for Ecommerce 2026 — ecentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "Best AI Tools for Ecommerce 2026",
    description:
      "Best AI tools for ecommerce in 2026, organized by category so merchants can compare content, personalization, search, analytics, and agent-commerce workflows.",
  });
