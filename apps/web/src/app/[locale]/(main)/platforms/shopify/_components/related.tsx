import type { Icon } from "@zenncore/icons";
import {
  ArrowRightIcon,
  BarChartIcon,
  CircleBoltIcon,
  FileIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages, getTranslations } from "next-intl/server";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const relatedMeta: readonly {
  href: string;
  icon: Icon;
}[] = [
  { href: "/features/product-listings", icon: CircleBoltIcon },
  { href: "/blog/best-ecommerce-ai-platforms", icon: SquareChartIcon },
  { href: "/blog", icon: FileIcon },
  { href: "/features", icon: BarChartIcon },
];

export const RelatedPages = async () => {
  const translate = await getTranslations("shopify");
  const messages = await getMessages();
  const items = messages.shopify.related.items;
  const related = items.map((item) => ({
    ...item,
    icon: relatedMeta.find((meta) => meta.href === item.href)?.icon ?? FileIcon,
  }));

  return (
    <section className="border-accent-foreground border-b">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

        <div className="p-6 md:p-12">
          <span className="font-normal text-3xl text-primary">
            {translate("related.number")}
          </span>
          <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
            {translate("related.title")}
          </h2>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {translate("related.description")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 sm:flex" />
          {related.map((entry) => (
            <article
              key={entry.href}
              className="flex h-full flex-col gap-4 bg-background-rich p-6 md:p-8"
            >
              <entry.icon
                aria-label={entry.name}
                className="size-7 text-primary"
              />
              <div className="flex flex-1 flex-col gap-3">
                <h3 className="font-body font-medium text-2xl text-foreground leading-tight">
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
          ))}
        </div>
      </div>
    </section>
  );
};
