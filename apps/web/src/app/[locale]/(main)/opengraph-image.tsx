import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "ecentic: Get the sale when AI does the shopping";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "Get the sale when AI does the shopping.",
    description:
      "Product feed and catalog optimization for AI shopping agents.",
  });
