import {
  CommerceBottleWineIcon,
  CommerceBowlFoodIcon,
  CommerceHeadphonesIcon,
  CommerceLipstickIcon,
  CommercePawIcon,
  CommerceShirtIcon,
  CommerceSofaIcon,
  GlobeIcon,
} from "@zenncore/icons";
import type { Sector } from "@/content/sectors";

const icons = {
  "wine-and-spirits": CommerceBottleWineIcon,
  "food-and-beverage": CommerceBowlFoodIcon,
  "beauty-and-personal-care": CommerceLipstickIcon,
  "consumer-electronics": CommerceHeadphonesIcon,
  "home-and-furniture": CommerceSofaIcon,
  "fashion-and-outdoor": CommerceShirtIcon,
  "health-wellness-and-pet": CommercePawIcon,
  "travel-and-experiences": GlobeIcon,
};

export const SectorIcon = ({ sector }: { sector: Sector }) => {
  const Icon = icons[sector];
  return <Icon aria-hidden className="size-8 shrink-0 text-primary-text" />;
};
