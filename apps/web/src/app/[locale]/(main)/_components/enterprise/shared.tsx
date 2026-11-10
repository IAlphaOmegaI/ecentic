import Image from "next/image";
import type { AppConfig } from "next-intl";
import { MarketingBand } from "@/components/marketing/primitives";

export const Programs = ({
  copy,
}: {
  copy: AppConfig["Messages"]["enterpriseHome"]["programs"];
}) => (
  <MarketingBand className="enterprise-programs">
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
          <span key={program.id} className="enterprise-program-todo">
            {program.title}
            <small>{copy.missingAsset}</small>
          </span>
        );
      })}
    </div>
  </MarketingBand>
);
