import type { StaticImageData } from "next/image";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The single banner every secondary page opens with: a full-viewport primary
 * slab with the page's ASCII motif bleeding off the right edge, content pinned
 * to the bottom.
 *
 * The darker shared primary-text token keeps solid light body copy accessible.
 * Headings use the local heading family; size and spacing carry hierarchy.
 * Artwork stays masked away from the text column.
 */
export const PageBanner = ({
  title,
  accent,
  description,
  badge,
  meta,
  actions,
  assurances,
  art,
}: PageBanner.Props) => (
  <section className="border-accent-foreground border-b p-4">
    <div className="relative flex min-h-[calc(100dvh-2rem)] flex-col justify-end overflow-hidden rounded-lg bg-primary-text">
      {art && (
        // `brightness-0 invert` flattens the glyphs to white and keeps their
        // alpha; the left-edge mask stops the densest motifs from running under
        // the description, which sits in the same horizontal band.
        //
        // The motif is described rather than hidden. It is the page's only
        // illustration and identifies the section at a glance, so it earns a
        // name in the accessibility tree and in image search — unlike the
        // full-bleed background textures elsewhere, which stay `alt=""`.
        // Pairing `art` and its description in one object keeps the two from
        // drifting apart at the nineteen call sites.
        <Image
          src={art.source}
          alt={art.alt}
          priority
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-[55%] select-none object-contain object-right opacity-40 brightness-0 invert [mask-image:linear-gradient(to_right,transparent,black_40%)] md:block"
        />
      )}
      <div className="relative z-10 mx-auto flex w-[min(1186px,calc(100%-24px))] flex-1 flex-col justify-end border-background-rich/20 border-x px-7 pt-24 pb-16 max-sm:w-full max-sm:px-4">
        {badge && <div className="mb-6">{badge}</div>}
        {assurances && (
          // Quiet middot note above the title — same claims the landing hero
          // carries under its CTA, moved up so they frame the headline instead
          // of trailing the actions.
          <p className="mb-4 max-w-2xl text-background-rich text-sm">
            {assurances.join(" · ")}
          </p>
        )}
        <h1 className="max-w-4xl font-heading font-medium text-5xl text-background-rich tracking-tight md:text-7xl">
          {title}
          {accent && (
            <span className="font-medium font-superior text-background-rich underline decoration-2 underline-offset-[0.18em]">
              {" "}
              {accent}
            </span>
          )}
        </h1>
        {meta && (
          <div className="mt-4 text-background-rich text-sm">{meta}</div>
        )}
        <p className="mt-6 max-w-2xl text-background-rich text-base leading-relaxed md:text-lg">
          {description}
        </p>
        {actions && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
        )}
      </div>
    </div>
  </section>
);

/**
 * Button classes for banner actions. The site's usual `color="primary"` button
 * is blue-on-blue here, so the lead action inverts to the light gradient and
 * the secondary takes a frosted white plate.
 *
 * Not the shared `variant="soft"`: that resolves to `bg-primary/10` with
 * `text-primary-rich`, which is blue on blue in this one place. The frost is
 * therefore spelled out here rather than borrowed.
 *
 * `secondary` still passes `variant="outline"`, but only for its box geometry —
 * outline contributes `border px-4` and, with no `color` prop at the call
 * sites, no compound colours. Holding the border at `transparent` rather than
 * dropping it keeps this button the same height as the lead's 1.5px border.
 *
 * Pair `lead` with `color="accent"` and `secondary` with `variant="outline"`.
 */
export const bannerAction = {
  lead: "w-full px-5 py-2.5 text-base sm:w-auto",
  secondary:
    "w-full border-transparent bg-background-rich/15 px-5 py-2.5 text-base text-background-rich backdrop-blur-sm transition-colors hover:bg-background-rich/25 sm:w-auto",
} as const;

export namespace PageBanner {
  /** The page's ASCII motif and the description screen readers announce for it. */
  export type Art = {
    source: StaticImageData;
    alt: string;
  };

  export type Props = {
    title: string;
    description: string;
    /** Trailing clause of the headline, rendered in LT Superior with underline. */
    accent?: string;
    /** Accepted for call-site compatibility; no longer rendered. */
    eyebrow?: string;
    badge?: ReactNode;
    meta?: ReactNode;
    actions?: ReactNode;
    assurances?: readonly string[];
    art?: Art;
  };
}
