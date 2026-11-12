import { CommerceFigure } from "@/components/marketing/commerce-figure";
import type { Sector } from "@/content/sectors";

const figures = {
  "wine-and-spirits": "wineBottle",
  "food-and-beverage": "packagedFood",
  "beauty-and-personal-care": "lipstick",
  "consumer-electronics": "headphones",
  "home-and-furniture": "sofa",
  "fashion-and-outdoor": "sneaker",
  "health-wellness-and-pet": "wellnessBottle",
  "travel-and-experiences": "suitcase",
} as const;

export const SectorRecordArtwork = ({
  sector,
  surface = "field",
}: {
  sector: Sector;
  surface?: "field" | "dark";
}) => (
  <div className="w-full min-w-0" data-sector-record-artwork>
    <CommerceFigure
      kind={figures[sector]}
      surface={surface}
      className="mx-auto aspect-[4/3] max-w-[440px]"
    />
  </div>
);
