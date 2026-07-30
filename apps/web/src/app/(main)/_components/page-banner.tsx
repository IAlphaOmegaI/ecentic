import type { StaticImageData } from "next/image";
import Image from "next/image";
import type { ReactNode } from "react";

/**
 * The single banner every secondary page opens with: a full-viewport primary
 * slab with the page's ASCII motif bleeding off the right edge, content pinned
 * to the bottom.
 *
 * Contrast on `bg-primary` (#1572fa) is the whole point of this component, and
 * the numbers are unforgiving. The slab's luminance puts solid white at 4.36:1,
 * so no white-based text clears the 4.5:1 AA bar at body sizes — white is the
 * ceiling, not a safe default, and every tint below it falls away fast:
 * /80 = 3.34, /75 = 3.11, /70 = 2.90, /60 = 2.51. Text therefore stays *solid*
 * white and lets size, weight, and tracking carry the hierarchy that opacity
 * used to fake.
 *
 * The title accent is the exception: LT Superior in solid white with an
 * underline, so the trailing clause keeps the headline's color while shifting
 * voice through typeface and underline instead of a second fill weight.
 *
 * The rule constrains *text*. A translucent white plate behind a solid-white
 * label (see `bannerAction.secondary`) keeps the label at its full 4.36:1 while
 * letting the field read through — which is why the secondary action can be
 * frosted but its text can never be `text-white/70`.
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
    <div className="relative flex min-h-[calc(100dvh-2rem)] flex-col justify-end overflow-hidden rounded-lg bg-primary">
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
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end border-white/20 border-x px-8 pt-24 pb-16">
        {badge && <div className="mb-6">{badge}</div>}
        {assurances && (
          // Quiet middot note above the title — same claims the landing hero
          // carries under its CTA, moved up so they frame the headline instead
          // of trailing the actions.
          <p className="mb-4 max-w-2xl text-sm text-white">
            {assurances.join(" · ")}
          </p>
        )}
        <h1 className="max-w-4xl font-semibold text-5xl text-white tracking-tight md:text-7xl">
          {title}
          {accent && (
            <span className="font-superior font-medium text-white underline decoration-2 underline-offset-[0.18em]">
              {" "}
              {accent}
            </span>
          )}
        </h1>
        {meta && <div className="mt-4 text-sm text-white">{meta}</div>}
        <p className="mt-6 max-w-2xl text-base text-white leading-relaxed md:text-lg">
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
    "w-full border-transparent bg-white/15 px-5 py-2.5 text-base text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:w-auto",
} as const;

export namespace PageBanner {
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
    art?: StaticImageData;
  };
}
