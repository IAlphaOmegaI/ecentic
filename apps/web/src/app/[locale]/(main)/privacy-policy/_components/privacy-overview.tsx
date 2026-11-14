import {
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  UserIcon,
} from "@zenncore/icons";
import type { AppConfig } from "next-intl";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { MarketingFeatureBand } from "@/components/marketing/primitives";

const icons = [
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
  UserIcon,
] as const;

/** The existing policy summary, with a visible distinction between data and controls. */
export const PrivacyOverview = ({ heading, items }: PrivacyOverview.Props) => (
  <MarketingFeatureBand tone="dark" aria-labelledby="privacy-overview-title">
    <div
      data-privacy-overview
      className="relative grid border-background-rich/20 border-y lg:grid-cols-[5fr_7fr]"
    >
      <MarketingEdgeCrosses />
      <MarketingEdgeCrosses edge="bottom" />
      <header className="relative flex min-w-0 flex-col border-background-rich/20 px-8 pt-10 max-sm:px-4 max-lg:border-b lg:border-r">
        <p className="mb-4 font-heading text-3xl text-primary-rich">
          {heading.number}
        </p>
        <h2 id="privacy-overview-title" className="max-w-[16ch]">
          {heading.title}
        </h2>
        <p className="mt-4 max-w-[40ch] text-background-rich/75 leading-relaxed">
          {heading.description}
        </p>
        <div className="mx-auto my-auto w-full max-w-110 py-6 max-lg:max-w-70">
          <CommerceFigure
            kind="documentStack"
            surface="dark"
            className="aspect-[4/3] w-full"
          />
        </div>
      </header>
      <div>
        {items.map((item, index) => {
          const Icon = icons[index] ?? CommerceFilePenIcon;
          return (
            <article
              key={item.title}
              className="grid grid-cols-[32px_1fr] gap-x-6 border-background-rich/15 border-b px-8 py-8 last:border-b-0 max-sm:gap-x-4 max-sm:px-4"
            >
              <Icon aria-hidden className="mt-1 size-8 text-primary-rich" />
              <div className="min-w-0">
                <h3 className="font-heading text-2xl! leading-tight!">
                  {item.title}
                </h3>
                <p className="mt-3 max-w-[54ch] text-background-rich/75 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </MarketingFeatureBand>
);

export namespace PrivacyOverview {
  export type Props = {
    heading: AppConfig["Messages"]["legal"]["privacyPolicy"]["summarySection"];
    items: AppConfig["Messages"]["legal"]["privacyPolicy"]["summary"];
  };
}
