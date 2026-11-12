import type { Sector } from "@/content/sectors";

export const shoppingSectors = [
  "wine-and-spirits",
  "food-and-beverage",
  "beauty-and-personal-care",
  "consumer-electronics",
  "home-and-furniture",
  "fashion-and-outdoor",
  "health-wellness-and-pet",
  "travel-and-experiences",
] as const satisfies readonly Sector[];

export const shoppingProductImage = (
  sector: Sector,
  scenario = 0,
  alternative = false,
) =>
  `/images/shopping/examples/${sector}-${scenario + 1}${alternative ? "-alternative" : ""}.webp`;
