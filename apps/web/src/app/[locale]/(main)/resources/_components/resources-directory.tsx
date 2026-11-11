import {
  ArrowRightIcon,
  CommerceCode_3Icon,
  FileIcon,
  SquareChartIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Fragment, type ReactNode } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingLightBand } from "@/components/marketing/light-band";
import {
  type MarketingPage,
  MarketingSection,
} from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { ResourcesTools } from "./resources-tools";

const ResourceLinks = ({ section }: { section: MarketingPage.Section }) => (
  <div
    className={cn("grid min-w-0", section.id === "guides" && "sm:grid-cols-2")}
  >
    {section.items?.map((item) => (
      <Link
        key={item.title}
        href={item.href ?? "#"}
        className={cn(
          "group relative flex min-w-0 flex-col border-accent-foreground border-b px-8 py-8 last:border-b-0 hover:bg-background-dimmed focus-visible:bg-background-dimmed focus-visible:outline-offset-[-4px] max-sm:px-4",
          section.id === "guides" && "sm:nth-last-2:border-b-0 sm:odd:border-r",
        )}
      >
        <div className="mb-8 flex h-14 items-center justify-between gap-6">
          {item.href?.includes("shopify") ? (
            <ProviderLogo
              provider="shopify"
              decorative
              className="h-12 rounded-none"
            />
          ) : item.href?.includes("woocommerce") ? (
            <ProviderLogo
              provider="woocommerce"
              decorative
              className="h-12 rounded-none"
            />
          ) : item.href?.includes("compare") ? (
            <SquareChartIcon
              aria-hidden
              className="size-12 text-primary-text"
            />
          ) : (
            <FileIcon aria-hidden className="size-12 text-primary-text" />
          )}
          <ArrowRightIcon
            aria-hidden
            className="size-4 shrink-0 text-primary-text"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-xl group-hover:text-primary-text">
            {item.title}
          </h3>
          <p className="mt-2 max-w-[56ch] text-foreground-dimmed">
            {item.body}
          </p>
          <span className="mt-auto block pt-8 text-primary-text text-sm">
            {item.label ?? item.title}
          </span>
        </div>
      </Link>
    ))}
  </div>
);

const ResourceSection = ({
  section,
  index,
}: {
  section: MarketingPage.Section;
  index: number;
}) => (
  <MarketingLightBand
    id={section.id}
    className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
      <div className="relative flex min-w-0 flex-col border-accent-foreground border-r max-md:border-r-0 max-md:border-b">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
        <div className="px-8 pt-10 max-sm:px-4">
          <span className="mb-4 block text-3xl text-primary-text tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2>{section.title}</h2>
          {section.description && (
            <p className="mt-4 max-w-[34ch] text-foreground-dimmed">
              {section.description}
            </p>
          )}
          {section.links && <MarketingActions actions={section.links} />}
        </div>
        <CommerceFigure
          kind={section.id === "guides" ? "catalog" : "workflow"}
          surface="rich"
          className="mt-auto"
        />
      </div>
      <ResourceLinks section={section} />
    </div>
  </MarketingLightBand>
);

const ResourceEndpoints = ({ section }: { section: MarketingPage.Section }) => (
  <MarketingLightBand id={section.id}>
    <div className="grid grid-cols-[1fr_2fr] max-lg:grid-cols-1">
      <div className="relative flex min-w-0 flex-col border-accent-foreground border-r max-lg:border-r-0 max-lg:border-b">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-lg:hidden" />
        <div className="px-8 pt-10 max-sm:px-4">
          <CommerceCode_3Icon
            aria-hidden
            className="mb-6 size-12 text-primary-text"
          />
          <h2>{section.title}</h2>
          <p className="mt-4 max-w-[36ch] text-foreground-dimmed">
            {section.description}
          </p>
        </div>
        <CommerceFigure
          kind="document"
          surface="rich"
          className="mt-auto max-lg:mx-auto max-lg:max-w-lg"
        />
      </div>
      <div className="min-w-0">
        {section.items?.map((item) => (
          <Link
            key={item.title}
            href={item.href ?? "#"}
            className="group grid min-w-0 grid-cols-[32px_1fr_auto] gap-4 border-accent-foreground border-b px-8 py-6 last:border-b-0 hover:bg-background focus-visible:bg-background focus-visible:outline-offset-[-4px] max-sm:px-4"
          >
            <FileIcon aria-hidden className="size-8 text-primary-text" />
            <div className="min-w-0">
              <h3 className="text-xl group-hover:text-primary-text">
                {item.title}
              </h3>
              <p className="mt-2 max-w-[58ch] text-foreground-dimmed text-sm">
                {item.body}
              </p>
              {item.href && (
                <code className="mt-4 block break-all font-mono text-primary-text text-xs">
                  {new URL(item.href).pathname}
                </code>
              )}
              <span className="sr-only">{item.label ?? item.title}</span>
            </div>
            <ArrowRightIcon className="mt-2 size-4 text-primary-text" />
          </Link>
        ))}
      </div>
    </div>
  </MarketingLightBand>
);

export const ResourcesDirectory = ({
  sections,
  copy,
  editorial,
}: ResourcesDirectory.Props) => (
  <>
    <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed">
      <nav aria-label={copy.navigationLabel} className="px-8 py-6 max-sm:px-4">
        <p className="mb-4 text-foreground text-sm">{copy.navigationLabel}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {sections.map((section) => (
            <Link
              href={`#${section.id}`}
              key={section.id}
              className="inline-flex min-h-10 items-center gap-2 text-foreground-rich hover:text-primary-text hover:underline hover:underline-offset-4"
            >
              {section.id === "public-endpoints"
                ? copy.publicEndpoints
                : section.title}
              <ArrowRightIcon className="size-4 rotate-90 text-primary-text" />
            </Link>
          ))}
        </div>
      </nav>
    </MarketingBand>
    {sections.map((section, index) => (
      <Fragment key={section.id}>
        <SectionGutter />
        {(() => {
          switch (section.id) {
            case "free-tools":
              return <ResourcesTools section={section} />;
            case "public-endpoints":
              return <ResourceEndpoints section={section} />;
            case "editorial":
              return (
                <div className="[&_section]:scroll-mt-24">
                  <MarketingSection section={section}>
                    {editorial}
                  </MarketingSection>
                </div>
              );
            default:
              return <ResourceSection section={section} index={index} />;
          }
        })()}
      </Fragment>
    ))}
  </>
);

export namespace ResourcesDirectory {
  export type Props = {
    sections: readonly MarketingPage.Section[];
    copy: { navigationLabel: string; publicEndpoints: string };
    editorial: ReactNode;
  };
}
