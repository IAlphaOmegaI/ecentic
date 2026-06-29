import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "AI Product Listing Optimization — ecentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "AI Product Listing Optimization",
    description:
      "AI product listing optimization for titles, descriptions, and structured product data.",
  });
