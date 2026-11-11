import Image from "next/image";
import type { AppConfig } from "next-intl";
import { MarketingBand } from "@/components/marketing/primitives";

export const Programs = ({ copy }: Programs.Props) => (
  <MarketingBand className="enterprise-programs [&>.marketing-rail>p]:text-(length:--text-sm) [&>.marketing-rail>div:not(.marketing-guides)]:mt-[30px] [&>.marketing-rail>div:not(.marketing-guides)]:grid [&>.marketing-rail>div:not(.marketing-guides)]:grid-cols-5 [&>.marketing-rail>div:not(.marketing-guides)]:items-center [&>.marketing-rail>div:not(.marketing-guides)]:gap-12 max-sm:[&>.marketing-rail>div:not(.marketing-guides)]:grid-cols-2 max-[1001px]:[&>.marketing-rail>div:not(.marketing-guides)]:gap-7 [&>.marketing-rail>p]:text-foreground-dimmed [&>.marketing-rail]:px-7 [&>.marketing-rail]:py-8 max-sm:[&>.marketing-rail]:px-4 max-sm:[&>.marketing-rail]:py-[26px] [&_img]:h-12 [&_img]:w-full [&_img]:object-contain max-sm:[&_img]:h-10">
    <p>{copy.eyebrow}</p>
    <div>
      {copy.items.map((program) => {
        const assets: Record<string, string> = {
          "plug-and-play": "plug-and-play.webp",
          "microsoft-for-startups": "microsoft-for-startups.png",
          "red-bull-basement": "red-bull-basement.svg",
          "founder-games": "the-founder-games.png",
        };
        const source = assets[program.id];
        return source ? (
          <Image
            key={program.id}
            src={`/partners/${source}`}
            alt={program.title}
            width={160}
            height={60}
          />
        ) : (
          <span
            key={program.id}
            className="enterprise-program-todo text-(length:--text-base) font-medium [&_small]:mt-2 [&_small]:block [&_small]:text-[11px] [&_small]:text-foreground-dimmed"
          >
            {program.title}
            <small>{copy.missingAsset}</small>
          </span>
        );
      })}
    </div>
  </MarketingBand>
);

export namespace Programs {
  export type Props = {
    copy: AppConfig["Messages"]["enterpriseHome"]["programs"];
  };
}
