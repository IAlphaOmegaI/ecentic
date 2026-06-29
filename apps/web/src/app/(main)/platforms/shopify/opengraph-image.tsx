import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "AI for Shopify Stores — ecentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "AI for Shopify Stores",
    description:
      "AI for Shopify stores that need stronger product listings, clearer competitor analysis, and approved updates pushed back into Shopify.",
  });
