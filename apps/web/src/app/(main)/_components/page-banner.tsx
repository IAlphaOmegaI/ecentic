import { CheckIcon } from "@zenncore/icons";
import type { StaticImageData } from "next/image";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The single banner every secondary page opens with: a full-bleed primary slab
 * with the page's ASCII motif bleeding off the right edge.
 *
 * Contrast on `bg-primary` (#1572fa) is the whole point of this component.
 * White sits at 4.4:1 against it, so anything tinted *toward* white — the old
 * `text-white/80` accent — collapses into the background. Every tier below
 * therefore steps away from the field rather than toward it: dimmed navy for
 * the accent, solid white for the assurance labels.
 *
 * The rule constrains *text*, not surfaces. A translucent white plate behind a
 * solid-white label (see `bannerAction.secondary`) keeps the label at its full
 * 4.4:1 while letting the field read through — which is why the secondary
 * action can be frosted but its text can never be `text-white/70`.
 */
export const PageBanner = ({
  eyebrow,
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
    <div className="relative size-full overflow-hidden rounded-lg bg-primary">
      {art && (
        // `brightness-0 invert` flattens the glyphs to white and keeps their
        // alpha; the left-edge mask stops the densest motifs from running under
        // the description, which sits in the same horizontal band.
        <Image
          src={art}
          alt=""
          aria-hidden
          priority
          className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-[55%] select-none object-contain object-right opacity-40 brightness-0 invert [mask-image:linear-gradient(to_right,transparent,black_40%)] md:block"
        />
      )}
      <div className="relative z-10 mx-auto max-w-6xl border-white/20 border-x px-8 pt-36 pb-16">
        {badge && <div className="mb-6">{badge}</div>}
        {eyebrow && (
          <p className="mb-4 font-medium text-sm text-white/60 uppercase tracking-[0.2em]">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl font-semibold text-5xl text-white tracking-tight md:text-7xl">
          {title}
          {accent && <span className="text-primary-dimmed"> {accent}</span>}
        </h1>
        {meta && <div className="mt-4 text-sm text-white/70">{meta}</div>}
        <p className="mt-6 max-w-2xl text-base text-white/75 leading-relaxed md:text-lg">
          {description}
        </p>
        {actions && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
        )}
        {assurances && (
          // A plain inline row, not pills. As opaque white capsules these were
          // the brightest objects on the slab — a strip of stickers competing
          // with the headline for first read, and the more a page listed the
          // worse it got. At this size the claims carry themselves, so the
          // chrome goes and the checks alone do the separating.
          //
          // Labels stay *solid* white per the contrast note above; only the
          // icon steps back, and an icon answers to the 3:1 non-text threshold
          // rather than 4.5:1. `gap-x-6` replaces the pill padding as the thing
          // that keeps entries apart, so this still parses as a list when it
          // wraps to a second line.
          <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-medium text-sm text-white">
            {assurances.map((assurance) => (
              <li key={assurance} className="flex items-center gap-2">
                <CheckIcon className="size-3.5 shrink-0 text-white/70" />
                {assurance}
              </li>
            ))}
          </ul>
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
    "w-full border-transparent bg-white/15 px-5 py-2.5 text-base text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:w-auto",
} as const;

export namespace PageBanner {
  export type Props = {
    title: string;
    description: string;
    /** Trailing clause of the headline, rendered in dimmed navy. */
    accent?: string;
    eyebrow?: string;
    badge?: ReactNode;
    meta?: ReactNode;
    actions?: ReactNode;
    assurances?: readonly string[];
    art?: StaticImageData;
  };
}
