import { ArrowRightIcon, BarChartIcon, CircleBoltIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
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
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="px-7 pt-16 pb-8 max-sm:px-4 max-sm:pt-10">
          <span className="font-normal text-3xl text-primary">
            {translate("related.number")}
          </span>
          <h2 className="mt-2 font-heading font-medium text-foreground-rich">
            {translate("related.title")}
          </h2>
          <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg max-sm:text-base">
            {translate("related.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
          {links.map((entry) => {
            const asset = linkAssets[entry.href];

            return (
              <article
                key={entry.href}
                className="flex h-full flex-col gap-4 bg-background p-6 md:p-8"
              >
                {"logo" in asset ? (
                  <Image src={asset.logo} alt={entry.name} className="size-7" />
                ) : (
                  <asset.icon
                    aria-label={entry.name}
                    className="size-7 text-primary"
                  />
                )}
                <div className="flex flex-1 flex-col gap-6">
                  <h3 className="font-heading font-medium text-2xl text-foreground leading-tight">
                    {entry.title}
                  </h3>
                  <p className="font-light text-foreground-dimmed leading-relaxed">
                    {entry.description}
                  </p>
                </div>
                <Button
                  color={entry.color}
                  className="w-fit"
                  render={<Link href={entry.href} />}
                >
                  {entry.label}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
