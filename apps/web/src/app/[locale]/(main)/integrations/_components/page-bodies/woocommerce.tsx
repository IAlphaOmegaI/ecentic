import { ArrowRightIcon, CommerceFileShieldIcon } from "@zenncore/icons";
import Image from "next/image";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { MarketingLightBand } from "@/components/marketing/light-band";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { IntegrationTechnicalText } from "../integration-content";
import { IntegrationWorkflow } from "../integration-workflow";
import { WooSetupRoadmap } from "./woocommerce-setup";

const Workflow = (props: MarketingSection.Props) => (
  <IntegrationWorkflow {...props} integration="woocommerce" />
);

const Checkout = ({ section, children }: MarketingSection.Props) => (
  <MarketingLightBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid md:grid-cols-2">
      <div className="relative flex min-w-0 flex-col bg-background-rich">
        <div className="px-7 pt-10 max-sm:px-4">
          <CommerceFileShieldIcon
            aria-hidden
            className="mb-6 size-12 text-primary-text"
          />
          <h2>{section.title}</h2>
          {section.description && (
            <p className="mt-4 text-foreground-dimmed">{section.description}</p>
          )}
        </div>
        <CommerceFigure
          kind="checkout"
          surface="rich"
          className="mx-auto max-w-lg"
        />
        <div aria-hidden="true" className="px-7 pb-8 max-sm:px-4">
          <div className="flex max-w-80 items-center justify-between gap-6">
            <Image
              src="/images/ucp.png"
              alt=""
              width={72}
              height={72}
              className="size-16 object-contain"
            />
            <ArrowRightIcon className="size-6 text-primary-text" />
            <ProviderLogo
              provider="woocommerce"
              decorative
              className="h-12 max-w-36 rounded-none"
            />
          </div>
          <code className="mt-8 block break-all text-primary-text text-sm">
            /.well-known/ucp
          </code>
        </div>
      </div>
      <div className="relative min-w-0 border-accent-foreground px-7 py-10 max-sm:px-4 max-md:border-t md:border-l">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <div className="space-y-6">
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="max-w-[60ch] text-foreground-dimmed">
              {paragraph}
            </p>
          ))}
        </div>
        {section.note && (
          <p className="mt-6 text-foreground-dimmed text-sm">{section.note}</p>
        )}
        {section.links && <MarketingActions actions={section.links} />}
      </div>
    </div>
    {children}
  </MarketingLightBand>
);

const Requirements = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <MarketingHeading title={section.title} description={section.description} />
    <div className="grid border-accent-foreground border-t md:grid-cols-2">
      {section.paragraphs?.map((paragraph, _index) => (
        <p
          key={paragraph}
          className="min-w-0 border-accent-foreground px-7 py-8 text-foreground-dimmed max-sm:px-4 md:odd:border-r max-md:[&:nth-child(n+2)]:border-t [&:nth-child(n+3)]:border-t"
        >
          <IntegrationTechnicalText text={paragraph} />
        </p>
      ))}
    </div>
    {children}
    {section.links && (
      <div className="border-accent-foreground border-t px-7 py-8 max-sm:px-4">
        <MarketingActions actions={section.links} className="mt-0" />
      </div>
    )}
  </MarketingBand>
);

const Setup = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <MarketingHeading title={section.title} description={section.description} />
    <WooSetupRoadmap section={section} />
    {children}
    {section.links && (
      <div className="px-7 pb-8 max-sm:px-4">
        <MarketingActions actions={section.links} />
      </div>
    )}
  </MarketingBand>
);

export const WoocommerceBody = ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => (
  <>
    {sections.map((section, index) => {
      const Component = (() => {
        switch (section.id) {
          case "workflow":
            return Workflow;
          case "agent-checkout":
            return Checkout;
          case "requirements":
            return Requirements;
          case "setup":
            return Setup;
          default:
            return MarketingSection;
        }
      })();
      return (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          <Component section={section}>
            {sectionChildren?.[section.id]}
          </Component>
        </Fragment>
      );
    })}
  </>
);
