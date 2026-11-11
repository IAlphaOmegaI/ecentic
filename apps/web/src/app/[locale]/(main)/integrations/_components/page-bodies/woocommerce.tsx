import { ArrowRightIcon } from "@zenncore/icons";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";

const Workflow = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <MarketingHeading title={section.title} description={section.description} />
    <div className="grid grid-cols-[1.15fr_1fr] border-accent-foreground border-t max-md:grid-cols-1">
      <ol className="m-0 list-none divide-y divide-accent-foreground p-0">
        {section.items?.map((item, index) => (
          <li
            key={item.title}
            className="grid grid-cols-[48px_1fr] gap-4 px-8 py-8 max-sm:grid-cols-[32px_1fr] max-sm:px-4"
          >
            <span className="font-heading text-3xl text-primary-text leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
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
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="relative flex min-w-0 flex-col items-center justify-center border-accent-foreground border-l bg-background-dimmed px-8 py-10 max-sm:px-4 max-md:border-t max-md:border-l-0"
      >
        <div className="flex w-full max-w-72 items-center justify-between gap-6">
          {(["chatgpt", "claude", "gemini"] as const).map((provider) => (
            <ProviderLogo
              key={provider}
              provider={provider}
              decorative
              className="h-8 max-w-20 rounded-none"
            />
          ))}
        </div>
        <div className="mt-6 h-6 w-2/3 border-accent-rich border-x border-b" />
        <div className="h-8 border-accent-rich border-l" />
        <div className="w-full max-w-80 border-accent-rich border-y py-6">
          <code className="block text-center text-primary-text text-sm">
            WooCommerce REST API
          </code>
          <pre className="mt-4 overflow-hidden text-center text-foreground-dimmed text-xs leading-6">
            {'{\n  "name": "...",\n  "description": "..."\n}'}
          </pre>
        </div>
        <div className="h-8 border-accent-rich border-l" />
        <ProviderLogo
          provider="woocommerce"
          decorative
          className="h-10 max-w-48 rounded-none"
        />
        <div className="h-8 border-accent-rich border-l" />
        <div className="h-36 w-full max-w-72 text-primary-text">
          <EvolvingAscii artwork="cart" />
        </div>
        <code className="text-foreground-dimmed text-sm">/.well-known/ucp</code>
      </div>
    </div>
    {children}
    {section.note && (
      <p className="px-8 py-8 text-foreground-dimmed text-sm max-sm:px-4">
        {section.note}
      </p>
    )}
    {section.links?.length && (
      <div className="px-8 pb-8 max-sm:px-4">
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
    <div className="grid grid-cols-[0.85fr_1.15fr] max-md:grid-cols-1">
      <div className="m-3 flex min-w-0 flex-col justify-between gap-12 bg-primary-text p-8 text-background-rich max-sm:m-2 max-sm:p-6">
        <div>
          <h2 className="text-background-rich">{section.title}</h2>
          {section.description && (
            <p className="mt-4 text-background-rich/85">
              {section.description}
            </p>
          )}
        </div>
        <div aria-hidden="true" className="pb-2">
          <div className="flex items-center justify-between gap-4 border-background-rich/30 border-b pb-6">
            <span className="font-heading text-4xl">UCP</span>
            <ArrowRightIcon className="size-4" />
            <span className="text-lg">WooCommerce</span>
          </div>
          <code className="mt-6 block break-all text-background-rich/85 text-sm">
            /.well-known/ucp
          </code>
        </div>
      </div>
      <div className="min-w-0 px-8 py-10 max-sm:px-4 max-sm:py-8">
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

const Setup = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <MarketingHeading title={section.title} description={section.description} />
    <ol className="m-0 grid list-none grid-cols-4 border-accent-foreground border-t p-0 max-sm:grid-cols-1 max-lg:grid-cols-2">
      {section.items?.map((item, index) => (
        <li
          key={item.title}
          className="relative min-w-0 px-8 pt-8 pb-10 max-sm:pl-20 max-sm:before:absolute max-sm:before:inset-y-0 max-sm:before:left-8 max-sm:before:border-accent-foreground max-sm:before:border-l"
        >
          <div className="relative mb-6 flex items-center gap-4 max-sm:absolute max-sm:top-8 max-sm:left-4 max-sm:mb-0 max-sm:bg-background max-sm:py-2">
            <span className="shrink-0 font-heading text-4xl text-primary-text leading-none">
              {String(index + 1).padStart(2, "0")}
            </span>
            {index < (section.items?.length ?? 0) - 1 && (
              <span
                aria-hidden="true"
                className="flex flex-1 items-center text-accent-rich max-sm:hidden"
              >
                <span className="h-px flex-1 bg-accent-rich" />
                <ArrowRightIcon className="-ml-2 size-4" />
              </span>
            )}
          </div>
          <h3>{item.title}</h3>
          <p className="mt-4 text-foreground-dimmed">{item.body}</p>
          {item.href && (
            <Link
              href={item.href}
              className="mt-6 inline-flex items-center gap-2 text-primary-text underline-offset-4 hover:underline"
            >
              {item.label ?? item.title}
              <ArrowRightIcon className="size-4" />
            </Link>
          )}
        </li>
      ))}
    </ol>
    {children}
    {section.note && (
      <p className="border-accent-foreground border-t bg-background-dimmed px-8 py-6 text-foreground-dimmed text-sm max-sm:px-4">
        {section.note}
      </p>
    )}
    {section.links && (
      <div className="px-8 pb-8 max-sm:px-4">
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
