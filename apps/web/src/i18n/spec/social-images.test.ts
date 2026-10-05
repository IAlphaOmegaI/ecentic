import { describe, expect, test } from "bun:test";
import { createMetadata } from "@/lib/seo";

const content = {
  title: "Pricing",
  description: "Choose an ecentic plan for your store.",
} as const;

describe("social image metadata", () => {
  test.each(["/pricing", "/es/pricing"])(
    "%s advertises a complete fallback image without changing its canonical",
    (path) => {
      const metadata = createMetadata({ ...content, path });
      const images = [
        {
          url: "https://ecentic.ai/opengraph-image",
          width: 1200,
          height: 630,
          alt: expect.any(String),
        },
      ];

      expect(metadata.openGraph?.images).toEqual(images);
      expect(metadata.twitter?.images).toEqual(images);
      expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
      expect(metadata.alternates).toEqual({
        canonical: path,
        languages: {
          en: "/pricing",
          es: "/es/pricing",
          "x-default": "/pricing",
        },
      });
    },
  );

  test("file-based images are left for Next.js to attach", () => {
    const metadata = createMetadata({
      ...content,
      path: "/features",
      image: false,
    });

    // Even `images: undefined` suppresses Next.js file metadata: it checks
    // hasOwnProperty rather than the value of this property.
    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).not.toHaveProperty("images");
    expect(metadata.openGraph).toMatchObject({
      title: "Pricing | ecentic",
      description: content.description,
    });
  });

  test("a custom image is shared by Open Graph and Twitter", () => {
    const metadata = createMetadata({
      ...content,
      path: "/pricing",
      image: "/images/pricing-social.png",
    });

    expect(metadata.openGraph?.images).toEqual([
      {
        url: "https://ecentic.ai/images/pricing-social.png",
        width: 1200,
        height: 630,
        alt: expect.any(String),
      },
    ]);
    expect(metadata.twitter?.images).toEqual(metadata.openGraph?.images);
  });
});
