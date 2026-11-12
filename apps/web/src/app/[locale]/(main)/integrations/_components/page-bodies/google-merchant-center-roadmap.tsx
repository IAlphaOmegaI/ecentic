import { ArrowRightIcon } from "@zenncore/icons";
import type { getMessages } from "next-intl/server";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { ConnectedJourney } from "@/components/marketing/connected-journey";
import type { MarketingSection } from "@/components/marketing/page";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";

type Copy = Awaited<ReturnType<typeof getMessages>>["googleMerchantDesign"];

const artwork = ["hub", "catalog", "inspection", "relay"] as const;

const RoadmapDiagram = ({ stage, copy }: { stage: number; copy: Copy }) => (
  <div className="flex min-w-0 flex-col bg-background-dimmed">
    <div className="relative min-h-72 flex-1 overflow-hidden text-primary-text md:min-h-80">
      <CommerceFigure
        kind={artwork[stage] ?? "hub"}
        surface="field"
        className="absolute inset-0 size-full"
      />
    </div>
    <div className="relative border-accent-foreground border-t px-8 py-6 max-sm:px-4">
      {(() => {
        switch (stage) {
          case 0:
            return (
              <div className="flex items-center justify-between gap-6">
                <ProviderLogo
                  provider="shopify"
                  className="h-10 rounded-none"
                />
                <ArrowRightIcon
                  aria-hidden
                  className="size-6 shrink-0 text-primary-text"
                />
                <ProviderLogo
                  provider="googleMerchant"
                  className="h-10 rounded-none"
                />
              </div>
            );
          case 1:
            return (
              <div className="grid grid-cols-[1fr_auto] items-center gap-6">
                <div className="border-accent-foreground border-r pr-6">
                  <p className="border-accent-foreground border-b pb-4 text-sm">
                    {copy.diagram.mainSource}
                  </p>
                  <p className="pt-4 text-primary-text text-sm">
                    {copy.diagram.supplemental}
                  </p>
                </div>
                <ProviderLogo
                  provider="googleMerchant"
                  className="h-10 rounded-none"
                />
              </div>
            );
          case 2:
            return (
              <div className="grid grid-cols-2 gap-6 text-sm">
                <p className="border-accent-foreground border-r pr-6">
                  {copy.diagram.published}
                </p>
                <p className="text-primary-text">{copy.diagram.diagnostics}</p>
              </div>
            );
          default:
            return (
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <p className="font-medium text-primary-text">
                  {copy.diagram.sync}
                </p>
                <span
                  aria-hidden="true"
                  className="min-w-8 flex-1 border-accent-foreground border-t"
                />
                <p>{copy.diagram.processing}</p>
              </div>
            );
        }
      })()}
    </div>
  </div>
);

export const GoogleMerchantCenterRoadmap = ({
  section,
  copy,
}: MarketingSection.Props & { copy: Copy }) => (
  <ConnectedJourney
    label={section.title}
    items={(section.items ?? []).map((item, index) => ({
      id: `merchant-${index}`,
      title: copy.stages[index] ?? item.title,
      icon:
        index === 0
          ? "access"
          : index === 1
            ? "catalog"
            : index === 2
              ? "compare"
              : "connect",
      content: (
        <div className="grid min-w-0 bg-background-dimmed md:grid-cols-[1fr_1fr]">
          <RoadmapDiagram stage={index} copy={copy} />
          <div className="flex min-w-0 flex-col justify-center px-8 py-10 max-sm:px-4 max-sm:py-8 md:border-accent-foreground md:border-l">
            {item.status && (
              <MarketingStatus status={item.status}>
                {item.statusLabel}
              </MarketingStatus>
            )}
            <h3 className="max-w-[22ch]">{item.title}</h3>
            <p className="mt-6 max-w-[42ch] text-foreground-dimmed leading-relaxed">
              {item.body}
            </p>
            {item.href && (
              <Link
                href={item.href}
                className="mt-6 text-primary-text underline underline-offset-4"
              >
                {item.label ?? item.title}
              </Link>
            )}
          </div>
        </div>
      ),
    }))}
  />
);
