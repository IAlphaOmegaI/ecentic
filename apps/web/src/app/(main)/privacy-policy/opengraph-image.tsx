import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "Privacy Policy — ecentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "Privacy Policy",
    description:
      "How ecentic collects, uses, and protects your data when using our e-commerce optimization platform.",
  });
