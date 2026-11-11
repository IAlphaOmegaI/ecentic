import {
  CommerceBasketShoppingIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  CommercePlug_3SparkleIcon,
} from "@zenncore/icons";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";

const icons = [
  CommercePlug_3SparkleIcon,
  CommerceFileShieldIcon,
  CommerceBasketShoppingIcon,
  CommerceGlobePointerIcon,
] as const;
const labels = [
  "WordPress.org",
  "wp-admin",
  "ChatGPT · Claude · Gemini",
  "/.well-known/ucp",
] as const;

/** The whole setup is readable at once; the drawing answers the pointer independently. */
export const WooSetupRoadmap = ({
  section,
}: {
  section: MarketingPage.Section;
}) => (
  <div
    className="relative grid border-accent-foreground border-t lg:grid-cols-[2fr_3fr]"
    data-woo-roadmap="connected"
  >
    <MarketingEdgeCrosses />
    <div className="relative min-w-0 bg-background-dimmed max-lg:border-accent-foreground max-lg:border-b lg:border-accent-foreground lg:border-r">
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-lg:hidden" />
      <div className="lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-8 px-8 pt-8 max-sm:px-4">
          <ProviderLogo
            provider="woocommerce"
            decorative
            className="h-12 max-w-40 rounded-none"
          />
          <code className="text-primary-text text-sm">WordPress.org</code>
        </div>
        <CommerceFigure
          kind="workflow"
          surface="field"
          className="mx-auto max-w-xl"
        />
      </div>
    </div>
    <ol className="relative m-0 list-none p-0">
      {section.items?.map((item, index) => {
        const Icon = icons[index] ?? CommercePlug_3SparkleIcon;
        return (
          <li
            key={item.title}
            className="relative grid grid-cols-[40px_1fr] gap-6 border-accent-foreground border-b px-8 py-8 last:border-b-0 max-sm:gap-4 max-sm:px-4"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-13 w-px bg-accent-foreground max-sm:left-9"
            />
            <span className="relative grid size-10 place-items-center bg-background">
              <Icon aria-hidden className="size-8 text-primary-text" />
            </span>
            <div className="min-w-0">
              <span className="mb-2 block font-heading text-3xl text-primary-text tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{item.title}</h3>
              <p className="mt-4 max-w-[55ch] text-foreground-dimmed">
                {item.body}
              </p>
              <code className="mt-6 block break-words text-primary-text text-sm">
                {labels[index]}
              </code>
            </div>
          </li>
        );
      })}
    </ol>
  </div>
);
