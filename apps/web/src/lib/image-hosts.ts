/**
 * Remote origins the image optimizer may fetch from. One list drives both
 * `images.remotePatterns` in `next.config.ts` and the blog's choice between an
 * optimized image and a plain one (`lib/blog-html.ts`, the blog index cards):
 * `/_next/image` answers 400 for any other origin, so an image from one has to
 * skip the optimizer rather than render broken. Repo posts may point `image` at
 * any `https://` URL, so that case is real, not hypothetical.
 *
 * No imports: `next.config.ts` loads this file, where path aliases do not
 * resolve.
 */
export const REMOTE_IMAGES = [
  { hostname: "d2qswj4ah2.ufs.sh", prefix: "/" },
  {
    hostname: "csuxjmfbwmkxiegfpljm.supabase.co",
    prefix: "/storage/v1/object/public/blog-images/",
  },
  // BabyLoveGrowth's own CDN. Its newer posts carry their title cards and body
  // images from here instead of Supabase.
  { hostname: "media.babylovegrowth.ai", prefix: "/blog-images/" },
] as const;

/**
 * Whether `/_next/image` can serve this source: a local path, or a remote one
 * on the list above. SVG is excluded — the optimizer refuses it without
 * `dangerouslyAllowSVG`, and a vector gains nothing from resizing anyway.
 */
export const isOptimizable = (source: string) => {
  if (/\.svg(?:[?#]|$)/i.test(source)) return false;
  if (source.startsWith("/")) return !source.startsWith("//");
  if (!URL.canParse(source)) return false;

  const url = new URL(source);
  return (
    url.protocol === "https:" &&
    REMOTE_IMAGES.some(
      (image) =>
        image.hostname === url.hostname &&
        url.pathname.startsWith(image.prefix),
    )
  );
};

/**
 * The `/_next/image` URL for one width of an optimizable source. `width` has to
 * be one of Next's `deviceSizes`/`imageSizes` and the quality one of
 * `images.qualities`, or the optimizer answers 400.
 */
export const optimizedUrl = (source: string, width: number, quality = 75) =>
  `/_next/image?url=${encodeURIComponent(source)}&w=${width}&q=${quality}`;
