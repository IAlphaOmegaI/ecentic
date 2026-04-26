import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "écentic — Win every AI shopping agent's cart";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "Win every AI shopping agent's cart.",
    description:
      "AI ecommerce platform for product listing optimization, competitor analysis, and AI shopping visibility.",
  });
