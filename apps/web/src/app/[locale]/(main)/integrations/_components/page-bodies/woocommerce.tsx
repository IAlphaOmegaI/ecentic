import {
  ArrowRightIcon,
  CommerceBasketShoppingIcon,
  CommerceCode_3Icon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import Image from "next/image";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import { IntegrationTechnicalText } from "../integration-content";
import { WooSetupRoadmap } from "./woocommerce-setup";

const workflowIcons = [
  CommerceBasketShoppingIcon,
  CommerceFilePenIcon,
  CommerceGlobePointerIcon,
] as const;

const WorkflowGraphic = ({ index }: { index: number }) => {
  switch (index) {
    case 0:
      return (
        <div className="flex w-full max-w-80 items-center justify-between gap-6">
          {(["chatgpt", "claude", "gemini"] as const).map((provider) => (
            <ProviderLogo
              key={provider}
              provider={provider}
              decorative
              className="h-12 max-w-20 rounded-none"
            />
          ))}
        </div>
      );
    case 1:
      return (
        <div className="flex w-full max-w-96 items-center justify-between gap-6">
          <CommerceCode_3Icon className="size-12 shrink-0 text-primary-text" />
          <code className="min-w-0 text-primary-text text-sm leading-7">
            <span className="block text-foreground-dimmed">
              WooCommerce REST API
            </span>
            <span className="block">{'"name": "...",'}</span>
            <span className="block">{'"description": "..."'}</span>
          </code>
        </div>
      );
    default:
      return (
        <div className="w-full max-w-80">
          <div className="flex items-center justify-between gap-6">
            <ProviderLogo
              provider="woocommerce"
              decorative
              className="h-12 max-w-32 rounded-none"
            />
            <ArrowRightIcon className="size-6 shrink-0 text-primary-text" />
            <CommerceBasketShoppingIcon className="size-12 text-primary-text" />
          </div>
          <code className="mt-6 block text-center text-foreground-dimmed text-sm">
            /.well-known/ucp
          </code>
        </div>
      );
  }
};

const Workflow = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <MarketingHeading title={section.title} description={section.description} />
    <ol className="m-0 list-none p-0">
      {section.items?.map((item, index) => {
        const Icon = workflowIcons[index] ?? CommerceBasketShoppingIcon;
        return (
          <li
            key={item.title}
            className="relative grid border-accent-foreground border-t md:grid-cols-2"
          >
            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
            <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
            <div className="grid min-w-0 grid-cols-[32px_1fr] gap-6 px-7 py-8 max-sm:px-4">
              <Icon className="mt-1 size-8 text-primary-text" aria-hidden />
              <div className="min-w-0">
                <h3>{item.title}</h3>
                <p className="mt-4 max-w-[46ch] text-foreground-dimmed">
                  {item.body}
                </p>
                {item.href && (
                  <MarketingActions
                    actions={[
                      { label: item.label ?? item.title, href: item.href },
                    ]}
                  />
                )}
              </div>
            </div>
            <div
              aria-hidden="true"
              className="relative flex min-h-40 min-w-0 items-center justify-center border-accent-foreground bg-background-dimmed px-7 py-8 max-sm:px-4 md:border-l"
            >
              <WorkflowGraphic index={index} />
            </div>
          </li>
        );
      })}
    </ol>
    {children}
    {section.note && (
      <p className="px-7 py-8 text-foreground-dimmed text-sm max-sm:px-4">
        {section.note}
      </p>
    )}
    {section.links?.length && (
      <div className="px-7 pb-8 max-sm:px-4">
        <MarketingActions actions={section.links} />
      </div>
    )}
  </MarketingBand>
);

const Checkout = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid md:grid-cols-2">
      <div className="relative flex min-w-0 flex-col justify-between gap-12 px-7 py-10 max-sm:px-4">
        <div>
          <CommerceFileShieldIcon
            aria-hidden
            className="mb-6 size-12 text-primary-text"
          />
          <h2>{section.title}</h2>
          {section.description && (
            <p className="mt-4 text-foreground-dimmed">{section.description}</p>
          )}
        </div>
        <div aria-hidden="true">
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
  </MarketingBand>
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
