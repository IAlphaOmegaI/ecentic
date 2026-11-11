import { ArrowRightIcon } from "@zenncore/icons";
import { Fragment, type ReactNode } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import {
  type MarketingPage,
  MarketingSection,
} from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { ResourcesTools } from "./resources-tools";

const ResourceLinks = ({ section }: { section: MarketingPage.Section }) => (
  <div className="min-w-0">
    {section.items?.map((item) => (
      <Link
        key={item.title}
        href={item.href ?? "#"}
        className="group grid min-w-0 grid-cols-[1fr_auto] gap-x-8 gap-y-4 border-accent-foreground border-b px-8 py-8 last:border-b-0 hover:bg-background-dimmed focus-visible:bg-background-dimmed focus-visible:outline-offset-[-4px] max-sm:px-4"
      >
        <div className="min-w-0">
          <h3 className="text-xl group-hover:text-primary-text">
            {item.title}
          </h3>
          <p className="mt-2 max-w-[56ch] text-foreground-dimmed">
            {item.body}
          </p>
          <span className="mt-4 block text-primary-text text-sm">
            {item.label ?? item.title}
          </span>
        </div>
        <ArrowRightIcon className="mt-2 size-4 text-primary-text" />
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
  <MarketingBand
    id={section.id}
    className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid grid-cols-[1fr_2fr] max-md:grid-cols-1">
      <div className="relative min-w-0 border-accent-foreground border-r px-8 py-12 max-sm:px-4 max-sm:py-8 max-md:border-r-0 max-md:border-b">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-md:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-md:hidden" />
        <span className="mb-8 block text-3xl text-primary-text tabular-nums">
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
      <ResourceLinks section={section} />
    </div>
  </MarketingBand>
);

const ResourceEndpoints = ({ section }: { section: MarketingPage.Section }) => (
  <MarketingBand
    id={section.id}
    className="scroll-mt-24 [&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed"
  >
    <div className="grid grid-cols-[1fr_2fr] max-lg:grid-cols-1">
      <div className="relative min-w-0 border-accent-foreground border-r px-8 py-12 max-sm:px-4 max-sm:py-8 max-lg:border-r-0 max-lg:border-b">
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2 max-lg:hidden" />
        <h2>{section.title}</h2>
        <p className="mt-4 max-w-[36ch] text-foreground-dimmed">
          {section.description}
        </p>
      </div>
      <div className="min-w-0">
        {section.items?.map((item) => (
          <Link
            key={item.title}
            href={item.href ?? "#"}
            className="group grid min-w-0 grid-cols-[1fr_auto] gap-4 border-accent-foreground border-b px-8 py-6 last:border-b-0 hover:bg-background focus-visible:bg-background focus-visible:outline-offset-[-4px] max-sm:px-4"
          >
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
  </MarketingBand>
);

export const ResourcesDirectory = ({
  sections,
  copy,
  editorial,
}: ResourcesDirectory.Props) => (
  <>
    <MarketingBand className="[&>.marketing-rail>.marketing-guides]:hidden [&>.marketing-rail]:bg-background-dimmed">
      <nav aria-label={copy.navigationLabel} className="px-8 py-6 max-sm:px-4">
        <p className="mb-4 text-foreground-dimmed text-sm">
          {copy.navigationLabel}
        </p>
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
