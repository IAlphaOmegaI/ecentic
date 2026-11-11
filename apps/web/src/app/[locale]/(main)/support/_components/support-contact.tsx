import {
  ArrowRightIcon,
  CommerceCityBuildingIcon,
  CommerceCode_3Icon,
  EnvelopeIcon,
  PhoneIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import {
  MarketingEdgeCrosses,
  MarketingLightBand,
} from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";

const icons = [
  EnvelopeIcon,
  PhoneIcon,
  CommerceCityBuildingIcon,
  CommerceCode_3Icon,
] as const;

export const SupportContact = ({ section }: SupportContact.Props) => (
  <MarketingLightBand id={section.id} className="scroll-mt-24">
    <div
      className="grid lg:grid-cols-[1fr_2fr]"
      data-support-contact="directory"
    >
      <div className="relative flex min-w-0 flex-col border-accent-foreground bg-background-dimmed max-lg:border-b lg:border-r">
        <div className="px-8 pt-10 max-sm:px-4">
          <h2>{section.title}</h2>
        </div>
        <CommerceFigure
          kind="hub"
          surface="field"
          className="mx-auto mt-auto max-w-lg"
        />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-lg:hidden" />
      </div>
      <div className="grid min-w-0 sm:grid-cols-2">
        {section.items?.map((item, index) => {
          const Icon = icons[index] ?? EnvelopeIcon;
          return (
            <article
              key={item.href}
              className="relative flex min-w-0 flex-col border-accent-foreground border-b px-8 py-8 last:border-b-0 max-sm:px-4 sm:nth-last-2:border-b-0 sm:odd:border-r"
            >
              <MarketingEdgeCrosses className="sm:hidden" />
              <Icon aria-hidden className="mb-6 size-10 text-primary-text" />
              <h3>{item.title}</h3>
              <p className="mt-4 mb-8 max-w-[40ch] text-foreground-dimmed">
                {item.body}
              </p>
              <div className="mt-auto">
                {item.href && (
                  <Button
                    color={index === 0 ? "primary" : "neutral"}
                    render={<Link href={item.href} />}
                  >
                    {item.label ?? item.title}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                )}
              </div>
              {index % 2 === 0 && (
                <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-sm:hidden" />
              )}
            </article>
          );
        })}
      </div>
    </div>
  </MarketingLightBand>
);
export namespace SupportContact {
  export type Props = { section: MarketingPage.Section };
}
