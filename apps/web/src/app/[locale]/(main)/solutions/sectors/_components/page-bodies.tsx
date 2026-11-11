import { BeautyAndPersonalCareBody } from "./page-bodies/beauty-and-personal-care";
import { ConsumerElectronicsBody } from "./page-bodies/consumer-electronics";
import { FashionAndOutdoorBody } from "./page-bodies/fashion-and-outdoor";
import { FoodAndBeverageBody } from "./page-bodies/food-and-beverage";
import { HealthWellnessAndPetBody } from "./page-bodies/health-wellness-and-pet";
import { HomeAndFurnitureBody } from "./page-bodies/home-and-furniture";
import { TravelAndExperiencesBody } from "./page-bodies/travel-and-experiences";
import { WineAndSpiritsBody } from "./page-bodies/wine-and-spirits";

export const pageBodies = {
  "food-and-beverage": FoodAndBeverageBody,
  "wine-and-spirits": WineAndSpiritsBody,
  "beauty-and-personal-care": BeautyAndPersonalCareBody,
  "consumer-electronics": ConsumerElectronicsBody,
  "home-and-furniture": HomeAndFurnitureBody,
  "fashion-and-outdoor": FashionAndOutdoorBody,
  "health-wellness-and-pet": HealthWellnessAndPetBody,
  "travel-and-experiences": TravelAndExperiencesBody,
};
