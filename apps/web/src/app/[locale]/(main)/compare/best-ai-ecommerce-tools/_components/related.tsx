import { ArrowRightIcon, BarChartIcon, CircleBoltIcon } from "@zenncore/icons";
import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { MarketingBand } from "@/components/marketing/primitives";
import { Link } from "@/i18n/navigation";
import shopify from "@/public/images/shopify.svg";
import woocommerce from "@/public/images/woocommerce.svg";

const linkAssets = {
  "/features": { icon: BarChartIcon },
  "/features/product-listings": { icon: CircleBoltIcon },
  "/platforms/shopify": { logo: shopify },
  "/platforms/woocommerce": { logo: woocommerce },
} as const;

export const RelatedPages = async () => {
  const translate = await getTranslations("compare");
  const messages = await getMessages();
  const links = messages.compare.related.links;

  return (
    <MarketingBand id="related-guides" className="scroll-mt-24">
      <SectionGutter />
      <div className="relative bg-background px-7 py-12 max-sm:px-4 max-sm:py-10">
        <span className="font-normal text-3xl text-primary">
          {translate("related.number")}
        </span>
        <h2 className="mt-4 max-w-3xl text-balance text-foreground-rich">
          {translate("related.title")}
        </h2>
        <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
          {translate("related.description")}
        </p>
      </div>
      <div className="relative border-accent-foreground border-t bg-background">
        {links.map((entry) => {
          const asset = linkAssets[entry.href];
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className="group grid items-start gap-4 border-accent-foreground border-b px-7 py-8 outline-offset-[-4px] last:border-b-0 hover:bg-background-dimmed focus-visible:outline-2 focus-visible:outline-primary max-sm:px-4 sm:grid-cols-[3rem_1fr] sm:gap-6 lg:grid-cols-[3rem_1fr_1fr]"
            >
              {"logo" in asset ? (
                <Image
                  src={asset.logo}
                  alt={entry.name}
                  className="size-10 object-contain"
                />
              ) : (
                <asset.icon
                  aria-hidden="true"
                  className="size-8 text-primary"
                />
              )}
              <div className="min-w-0">
                <h3 className="max-w-lg font-medium text-2xl text-foreground-rich leading-tight group-hover:text-primary-text">
                  {entry.title}
                </h3>
                <span className="mt-4 inline-flex items-center gap-2 font-medium text-primary-text text-sm">
                  {entry.label}
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </span>
              </div>
              <p className="max-w-xl text-foreground-dimmed leading-relaxed sm:col-start-2 lg:col-start-3">
                {entry.description}
              </p>
            </Link>
          );
        })}
      </div>
    </MarketingBand>
  );
};
