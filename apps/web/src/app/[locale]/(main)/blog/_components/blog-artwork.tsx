import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";

export const BlogArtwork = () => (
  <div
    data-blog-artwork="open-book"
    className="relative flex aspect-square w-full min-w-0 items-center justify-center overflow-hidden px-2"
  >
    <EvolvingAscii
      artwork="catalog"
      className="pointer-events-none absolute inset-0 text-background-rich opacity-20"
    />
    <CommerceFigure
      kind="openBook"
      className="relative aspect-[5/4] w-full max-w-[640px] bg-transparent [--hairline-edge:color-mix(in_oklab,var(--color-background-rich)_85%,transparent)] [--hairline-hi:var(--color-background-rich)] [--hairline-lo:color-mix(in_oklab,var(--color-background-rich)_28%,transparent)] [--hairline-mid:color-mix(in_oklab,var(--color-background-rich)_55%,transparent)] [--hairline-plate:var(--color-primary-text)] max-sm:max-w-[390px] max-lg:max-w-[540px]"
    />
  </div>
);
