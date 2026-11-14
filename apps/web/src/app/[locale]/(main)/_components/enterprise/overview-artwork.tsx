import { EvolvingAscii } from "@/components/marketing/evolving-ascii";

/** Tonal cart artwork fills the hero without competing with its copy. */
export const OverviewArtwork = () => (
  <div
    data-home-hero-artwork
    className="relative aspect-square w-full min-w-0 self-center overflow-hidden text-background-rich max-lg:mx-auto max-lg:max-w-130 lg:aspect-[4/5]"
  >
    <EvolvingAscii artwork="homeCart" className="opacity-90" />
  </div>
);
