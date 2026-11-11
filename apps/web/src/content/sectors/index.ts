import { scenarios as beautyAndPersonalCare } from "./beauty-and-personal-care";
import { scenarios as consumerElectronics } from "./consumer-electronics";
import { scenarios as fashionAndOutdoor } from "./fashion-and-outdoor";
import { scenarios as foodAndBeverage } from "./food-and-beverage";
import { scenarios as healthWellnessAndPet } from "./health-wellness-and-pet";
import { scenarios as homeAndFurniture } from "./home-and-furniture";
import { scenarios as travelAndExperiences } from "./travel-and-experiences";
import { scenarios as wineAndSpirits } from "./wine-and-spirits";

export type ShelfScenario = {
  key: string;
  required: readonly number[];
  missing: readonly number[];
};

export const sectorShelves = {
  "wine-and-spirits": wineAndSpirits,
  "food-and-beverage": foodAndBeverage,
  "beauty-and-personal-care": beautyAndPersonalCare,
  "consumer-electronics": consumerElectronics,
  "home-and-furniture": homeAndFurniture,
  "fashion-and-outdoor": fashionAndOutdoor,
  "health-wellness-and-pet": healthWellnessAndPet,
  "travel-and-experiences": travelAndExperiences,
} as const;

export type Sector = keyof typeof sectorShelves;
