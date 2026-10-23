import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "AI Ecommerce Tools for Merchants — ecentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "AI Ecommerce Tools for Merchants",
    description:
      "AI ecommerce tools that optimize your product feed and catalog for AI shopping agents.",
  });
