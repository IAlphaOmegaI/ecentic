import { CommerceFigure } from "./commerce-figure";

/** A separate drawing plane keeps the subject legible and the headline quiet. */
export const HeroFigure = ({
  kind,
}: {
  kind: CommerceFigure.Props["kind"];
}) => (
  <div
    data-hero-figure={kind}
    className="relative flex min-w-0 items-center justify-center overflow-hidden border-background-rich/20 border-l px-2 py-12 max-lg:border-t max-lg:border-l-0 max-lg:py-0"
  >
    <CommerceFigure
      kind={kind}
      className="aspect-[5/4] w-full max-w-[640px] bg-transparent [--hairline-edge:color-mix(in_oklab,var(--color-background-rich)_85%,transparent)] [--hairline-hi:var(--color-background-rich)] [--hairline-lo:color-mix(in_oklab,var(--color-background-rich)_24%,transparent)] [--hairline-mid:color-mix(in_oklab,var(--color-background-rich)_55%,transparent)] [--hairline-plate:var(--color-primary-text)] max-sm:max-w-[330px] max-lg:max-w-[460px] [&>[data-hairline]]:bg-transparent [&>[data-hairline]]:text-background-rich [&_svg]:overflow-visible"
    />
  </div>
);
