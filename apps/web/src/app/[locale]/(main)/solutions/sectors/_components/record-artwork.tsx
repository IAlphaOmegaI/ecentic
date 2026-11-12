import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { Sector } from "@/content/sectors";

export const SectorRecordArtwork = ({
  sector,
  surface = "field",
}: {
  sector: Sector;
  surface?: "field" | "dark";
}) => (
  <div
    className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_112px] items-center gap-4 sm:grid-cols-[minmax(0,1fr)_144px]"
    data-sector-record-artwork
  >
    <CommerceFigure
      kind="catalog"
      surface={surface}
      className="mx-auto max-w-[320px]"
    />
    <div aria-hidden className="relative aspect-square text-primary-text">
      <EvolvingAscii
        artwork={sector === "consumer-electronics" ? "headphones" : "catalog"}
      />
    </div>
  </div>
);
