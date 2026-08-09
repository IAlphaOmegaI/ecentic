import {
  ArrowRightIcon,
  BarChartIcon,
  GaugeIcon,
  RocketIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Translate = (key: string) => string;

const pageKeys = [
  {
    href: "/features",
    key: "features" as const,
    icon: BarChartIcon,
  },
  {
    href: "/features/product-listings",
    key: "productListings" as const,
    icon: ShoppingCartIcon,
  },
  {
    href: "/platforms/shopify",
    key: "shopify" as const,
    icon: RocketIcon,
  },
  {
    href: "/compare/best-ai-ecommerce-tools",
    key: "compare" as const,
    icon: GaugeIcon,
  },
  {
    href: "/enterprise",
    key: "enterprise" as const,
    icon: ShieldCheckIcon,
  },
] as const;

const Card = ({
  href,
  pageKey,
  Icon,
  translate,
}: {
  href: string;
  pageKey: (typeof pageKeys)[number]["key"];
  Icon: ComponentType<{ className?: string }>;
  translate: Translate;
}) => (
  <article className="relative flex flex-col gap-2 bg-background-dimmed p-4 pt-24">
    <Icon className="size-16 text-primary" />
    <h3 className="font-body font-medium text-2xl text-foreground md:text-4xl">
      {translate(`discoveryPaths.pages.${pageKey}.title`)}
    </h3>
    <p className="mt-auto font-body font-light text-foreground-dimmed text-lg">
      {translate(`discoveryPaths.pages.${pageKey}.description`)}
    </p>
    <Button variant="flat" color="primary" render={<Link href={href} />}>
      {translate(`discoveryPaths.pages.${pageKey}.label`)}
      <ArrowRightIcon className="size-4" />
    </Button>
  </article>
);

export const DiscoveryPaths = async ({ locale }: DiscoveryPaths.Props) => {
  const translate = await getTranslations({ locale, namespace: "home" });

  return (
    <section
      id="resources"
      className="scroll-mt-[5.5rem] border-accent-foreground border-y"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="border-accent-foreground border-b p-8 font-body text-3xl text-foreground md:text-5xl">
          {translate("discoveryPaths.title")}
        </h2>

        <div className="grid gap-px border-accent-foreground bg-accent-foreground md:grid-cols-2">
          {pageKeys.map((page) => (
            <Card
              key={page.href}
              href={page.href}
              pageKey={page.key}
              Icon={page.icon}
              translate={translate}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export namespace DiscoveryPaths {
  export type Props = {
    locale: Locale;
  };
}
