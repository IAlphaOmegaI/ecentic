import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "ecentic blog — Agent commerce insights";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "Blog",
    description:
      "Product feed, structured data and AI commerce guides for merchants selling through AI shopping agents.",
  });
