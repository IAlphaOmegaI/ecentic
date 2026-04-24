import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "AI for WooCommerce — écentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "AI for WooCommerce",
    description:
      "AI for WooCommerce stores that need product listing optimization, competitor analysis, and a clearer path from insights to updates.",
  });
