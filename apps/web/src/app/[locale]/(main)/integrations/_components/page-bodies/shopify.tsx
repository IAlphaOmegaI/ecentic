import { cn } from "@zenncore/utils";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ShopifySetupJourney } from "./shopify-setup-journey";

const ShopifyWorkflow = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="relative flex min-h-80 min-w-0 items-center overflow-hidden px-7 py-12 max-sm:min-h-72 max-sm:px-4 max-sm:py-8">
      <div className="absolute inset-y-0 right-0 w-3/5 text-primary/40 [mask-image:linear-gradient(to_right,transparent,black_35%)] max-sm:w-full max-sm:opacity-40">
        <EvolvingAscii artwork="bag" fit="cover" />
      </div>
      <div className="relative z-1 min-w-0">
        <h2 className="max-w-[17ch]">{section.title}</h2>
        {section.description && (
          <p className="mt-4 max-w-[60ch] text-foreground-dimmed">
            {section.description}
          </p>
        )}
      </div>
    </div>
    <ol className="grid grid-cols-[1fr_1.2fr_1fr] border-accent-foreground border-t max-md:grid-cols-1">
      {section.items?.map((item, index) => (
        <li
          key={item.title}
          className={cn(
            "relative min-w-0 border-accent-foreground border-r px-7 py-8 last:border-r-0 max-sm:px-4 max-md:border-r-0 max-md:border-b max-md:last:border-b-0",
            index === 1 && "bg-primary/5",
          )}
        >
          <div className="mb-8 flex items-center gap-4 max-md:mb-5">
            <span className="font-heading text-4xl text-primary leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              aria-hidden="true"
              className="flex-1 overflow-hidden whitespace-nowrap text-primary/55"
            >
              {index === 2
                ? "····································"
                : "───────────────────────>"}
            </span>
          </div>
          {item.status && (
            <MarketingStatus status={item.status}>
              {item.statusLabel}
            </MarketingStatus>
          )}
          <h3>{item.title}</h3>
          <p className="mt-5 max-w-[40ch] text-foreground-dimmed leading-relaxed">
            {item.body}
          </p>
          {item.href && (
            <MarketingActions
              actions={[{ label: item.label ?? item.title, href: item.href }]}
            />
          )}
        </li>
      ))}
    </ol>
    {children}
  </MarketingBand>
);

const ShopifyAccess = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
  >
    <div className="px-7 py-10 max-sm:px-4 max-sm:py-8">
      <h2 className="max-w-[22ch]">{section.title}</h2>
      <p className="mt-5 max-w-[78ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    </div>
    <div className="[&_article]:bg-background [&_tbody]:bg-background [&_thead]:bg-background-dimmed">
      {children}
    </div>
  </MarketingBand>
);

const ShopifyRequirements = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
      <div className="min-w-0 border-accent-foreground border-r px-7 py-10 max-sm:px-4 max-sm:py-8 max-md:border-r-0 max-md:border-b">
        <h2>{section.title}</h2>
        {section.links && <MarketingActions actions={section.links} />}
      </div>
      <div className="min-w-0 divide-y divide-accent-foreground">
        {section.paragraphs?.map((paragraph, index) => (
          <div
            key={paragraph}
            className="grid grid-cols-[32px_1fr] gap-5 px-7 py-7 max-sm:gap-4 max-sm:px-4 max-sm:py-6"
          >
            <span aria-hidden="true" className="text-primary text-xl">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-foreground-dimmed leading-relaxed">
              {paragraph}
            </p>
          </div>
        ))}
      </div>
    </div>
    {children}
  </MarketingBand>
);

const ShopifySetup = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="px-7 py-10 max-sm:px-4 max-sm:py-8">
      <h2>{section.title}</h2>
    </div>
    {section.items && (
      <ShopifySetupJourney title={section.title} items={section.items} />
    )}
    {section.note && (
      <p className="border-accent-foreground border-t bg-background-dimmed px-7 py-6 text-foreground-dimmed leading-relaxed max-sm:px-4">
        {section.note}
      </p>
    )}
    {children}
  </MarketingBand>
);

export const ShopifyBody = ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => (
  <>
    {sections.map((section) => {
      const Section = (() => {
        switch (section.id) {
          case "workflow":
            return ShopifyWorkflow;
          case "access":
            return ShopifyAccess;
          case "requirements":
            return ShopifyRequirements;
          case "setup":
            return ShopifySetup;
          default:
            return MarketingSection;
        }
      })();

      return (
        <Section key={section.id} section={section}>
          {sectionChildren?.[section.id]}
        </Section>
      );
    })}
  </>
);
