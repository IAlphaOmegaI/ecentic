import { Tab, Tabs, TabsList, TabsPanel } from "@zenncore/web/components/tabs";
import type { getMessages } from "next-intl/server";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import type { MarketingSection } from "@/components/marketing/page";
import { MarketingStatus } from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";

type Copy = Awaited<ReturnType<typeof getMessages>>["googleMerchantDesign"];

const artwork = ["bag", "commerce", "cart", "closing"] as const;

const RoadmapDiagram = ({ stage, copy }: { stage: number; copy: Copy }) => (
  <div className="flex min-w-0 flex-col bg-background-dimmed">
    <div className="relative min-h-72 flex-1 overflow-hidden text-primary-text md:min-h-80">
      <EvolvingAscii
        artwork={artwork[stage] ?? "commerce"}
        fit="cover"
        className="absolute inset-0"
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
                <div className="flex flex-1 flex-col items-center gap-2">
                  <code className="font-mono text-primary-text text-xs">
                    /auth/content
                  </code>
                  <span
                    aria-hidden="true"
                    className="w-full border-accent-foreground border-t"
                  />
                </div>
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
  <Tabs defaultValue={0} className="min-w-0">
    <TabsList
      activateOnFocus
      aria-label={section.title}
      className="grid w-full grid-cols-2 rounded-none border-accent-foreground border-x-0 md:grid-cols-4"
    >
      {section.items?.map((item, index) => (
        <Tab
          key={item.title}
          value={index}
          className="group h-auto min-w-0 items-start justify-start gap-4 border-accent-foreground px-8 py-6 text-left text-foreground-dimmed data-[active]:bg-primary/8 data-selected:bg-primary/8 data-[active]:text-primary-text data-selected:text-primary-text max-sm:px-4 max-md:border-b"
        >
          <span className="font-heading text-2xl leading-none">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-sm leading-relaxed">{copy.stages[index]}</span>
        </Tab>
      ))}
    </TabsList>
    {section.items?.map((item, index) => (
      <TabsPanel
        key={item.title}
        value={index}
        className="grid min-w-0 md:grid-cols-[7fr_5fr] [&[inert]]:hidden"
      >
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
      </TabsPanel>
    ))}
  </Tabs>
);
