import Image from "next/image";
import type { AppConfig } from "next-intl";
import type { Sector } from "@/content/sectors";

const brands = {
  "food-and-beverage": [
    { key: "starbucks", name: "Starbucks" },
    { key: "mcdonalds", name: "McDonald’s" },
  ],
  "wine-and-spirits": [{ key: "jameson", name: "Jameson" }],
  "beauty-and-personal-care": [{ key: "dior", name: "Dior" }],
  "consumer-electronics": [
    { key: "samsung", name: "Samsung" },
    { key: "sony", name: "Sony" },
  ],
  "home-and-furniture": [{ key: "ikea", name: "IKEA" }],
  "fashion-and-outdoor": [
    { key: "nike", name: "Nike" },
    { key: "adidas", name: "adidas" },
  ],
  "health-wellness-and-pet": [{ key: "fitbit", name: "Fitbit" }],
  "travel-and-experiences": [
    { key: "airbnb", name: "Airbnb" },
    { key: "hilton", name: "Hilton" },
  ],
} as const;

/** Brand context is separate from synthetic records: it is not a customer roster. */
export const SectorBrandReferences = ({
  sector,
  copy,
}: {
  sector: Sector;
  copy: AppConfig["Messages"]["sectorReview"]["references"];
}) => (
  <aside
    data-sector-references
    className="grid min-w-0 gap-7 border-accent-foreground border-t px-4 py-8 sm:px-8 md:grid-cols-[1fr_2fr] md:items-center"
  >
    <div className="flex min-w-0 items-center gap-8">
      {brands[sector].map((brand) => (
        <div key={brand.key} className="flex min-w-0 flex-col gap-2">
          <Image
            src={`/images/sector-references/${brand.key}.svg`}
            width={100}
            height={72}
            alt={brand.name}
            className="h-16 w-auto max-w-28 object-contain [[data-solution-feature]_&]:invert"
            unoptimized
          />
          <span className="text-foreground-dimmed text-xs">{brand.name}</span>
        </div>
      ))}
    </div>
    <div>
      <p className="font-medium text-foreground-rich text-sm">{copy.label}</p>
      <p className="mt-3 max-w-[65ch] text-foreground-dimmed text-sm leading-relaxed">
        {copy.note}
      </p>
    </div>
  </aside>
);
