import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "AI Ecommerce Tools for Merchants — écentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "AI Ecommerce Tools for Merchants",
    description:
      "AI ecommerce tools for product listing optimization, competitor analysis, and AI shopping visibility.",
  });
