import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";

export const alt = "écentic — Win every AI shopping agent's cart";
export const size = ogImageSize;
export const contentType = ogImageContentType;

export default () =>
  createOgImage({
    title: "Win every AI shopping agent's cart.",
    description:
      "Simulate how GPT-4, Claude, Gemini, and Perplexity choose your products, diagnose losses, and auto-optimize listings.",
  });
