import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingFeatureBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const icons = [
  CommerceFileShieldIcon,
  CommerceBasketShoppingIcon,
  CommerceGlobePointerIcon,
  SquareChartIcon,
] as const;

export const ResourcesTools = ({ section }: ResourcesTools.Props) => {
  const [featured, ...tools] = section.items ?? [];
  return (
    <MarketingFeatureBand id={section.id} className="scroll-mt-24">
      <MarketingHeading
        eyebrow="01"
        title={section.title}
        description={section.description}
        className="py-10"
      />
      {featured && (
        <div className="relative grid border-[var(--rail-color)] border-y md:grid-cols-2">
          <MarketingEdgeCrosses />
          <div className="relative flex min-w-0 items-center bg-emphasis-dimmed text-background-rich max-md:border-[var(--rail-color)] max-md:border-b md:border-[var(--rail-color)] md:border-r">
            <CommerceFigure
              kind="inspection"
              surface="dark"
              className="mx-auto max-w-lg"
            />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <MarketingEdgeCrosses edge="bottom" className="md:hidden" />
          </div>
          <article className="flex min-w-0 flex-col justify-center bg-linear-to-br from-primary-dimmed/70 to-emphasis-dimmed px-8 py-10 max-sm:px-4">
            <SquareChartIcon
              aria-hidden
              className="mb-8 size-12 text-primary-rich"
            />
            <h3 className="text-3xl!">{featured.title}</h3>
            <p className="mt-4 max-w-[45ch] text-background-rich/75">
              {featured.body}
            </p>
            <div className="mt-8">
              <Button
                color="primary"
                render={<Link href={featured.href ?? "/sign-up"} />}
              >
                {featured.label ?? featured.title}
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </article>
        </div>
      )}
      <div className="relative grid md:grid-cols-2">
        {tools.map((item, index) => {
          const Icon = icons[index] ?? SquareChartIcon;
          return (
            <article
              key={item.title}
              className="relative flex min-w-0 flex-col border-[var(--rail-color)] border-b px-8 py-8 max-sm:px-4 md:odd:border-r"
            >
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus
                className={`top-0 right-0 translate-x-1/2 -translate-y-1/2 ${index % 2 === 0 ? "md:hidden" : ""}`}
              />
              <Icon aria-hidden className="mb-6 size-10 text-primary-rich" />
              <h3>{item.title}</h3>
              <p className="mt-4 mb-8 max-w-[52ch] text-background-rich/75">
                {item.body}
              </p>
              <div className="mt-auto">
                <Button
                  color="neutral"
                  render={<Link href={item.href ?? "/tools"} />}
                >
                  {item.label ?? item.title}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </article>
          );
        })}
        <MarketingEdgeCrosses edge="bottom" />
        <Plus className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
      </div>
      {section.links && (
        <div className="px-8 py-8 max-sm:px-4">
          <MarketingActions actions={section.links} className="mt-0" />
        </div>
      )}
    </MarketingFeatureBand>
  );
};

export namespace ResourcesTools {
  export type Props = { section: MarketingPage.Section };
}
