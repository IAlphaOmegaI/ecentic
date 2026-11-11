import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { getMessages } from "next-intl/server";
import { Fragment } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import type { MarketingBodyProps } from "@/components/marketing/body";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingStatus,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Link } from "@/i18n/navigation";
import { GoogleMerchantCenterRoadmap } from "./google-merchant-center-roadmap";

type Copy = Awaited<ReturnType<typeof getMessages>>["googleMerchantDesign"];

const SectionHeading = ({ section }: MarketingSection.Props) => (
  <>
    {section.eyebrow && <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>}
    <h2>{section.title}</h2>
    {section.description && (
      <p className="mt-4 max-w-[65ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
        {section.description}
      </p>
    )}
    {section.paragraphs?.map((paragraph) => (
      <p className="mt-4 max-w-[70ch]" key={paragraph}>
        {paragraph}
      </p>
    ))}
  </>
);

const SectionEnding = ({
  section,
  children,
  showNote = true,
}: MarketingSection.Props & { showNote?: boolean }) => (
  <>
    {children}
    {((showNote && section.note) || section.links?.length) && (
      <div className="border-accent-foreground border-t px-8 py-6 max-sm:px-4">
        {showNote && section.note && (
          <p className="max-w-[90ch] text-foreground-dimmed text-sm leading-relaxed">
            {section.note}
          </p>
        )}
        {section.links && <MarketingActions actions={section.links} />}
      </div>
    )}
  </>
);

const Workflow = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="px-8 py-10 max-sm:px-4 max-sm:py-8">
      <SectionHeading section={section} />
    </div>
    <div className="grid min-w-0 border-accent-foreground border-t md:grid-cols-[5fr_7fr]">
      <div className="relative min-h-80 min-w-0 overflow-hidden bg-background-dimmed text-primary-text max-md:border-accent-foreground max-md:border-b md:border-accent-foreground md:border-r">
        <EvolvingAscii
          artwork="cart"
          fit="cover"
          className="absolute inset-0 scale-110"
        />
      </div>
      <Accordion
        multiple
        defaultValue={section.items?.[0] ? [section.items[0].title] : []}
        className="min-w-0 justify-start"
      >
        {section.items?.map((item) => (
          <AccordionItem
            key={item.title}
            value={item.title}
            className="border-accent-foreground last:border-b-0"
          >
            <AccordionTrigger
              className="items-center px-8 py-6 text-xl leading-snug hover:text-primary-text max-sm:px-4"
              classList={{
                trigger: { icon: "size-4 shrink-0 transition-transform" },
              }}
            >
              {item.title}
            </AccordionTrigger>
            <AccordionPanel>
              <div className="px-8 pb-6 max-sm:px-4">
                {item.status && (
                  <MarketingStatus status={item.status}>
                    {item.statusLabel}
                  </MarketingStatus>
                )}
                <p className="max-w-[50ch] text-foreground-dimmed leading-relaxed">
                  {item.body}
                </p>
                {item.href && (
                  <Link
                    href={item.href}
                    className="mt-4 inline-block text-primary-text underline underline-offset-4"
                  >
                    {item.label ?? item.title}
                  </Link>
                )}
              </div>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
    <SectionEnding section={section} showNote={false}>
      {children}
    </SectionEnding>
  </MarketingBand>
);

const Access = ({ section, children }: MarketingSection.Props) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="bg-background-dimmed px-8 pt-10 pb-8 max-sm:px-4 max-sm:pt-8">
      <SectionHeading section={section} />
    </div>
    <div className="flex min-w-0 items-center gap-6 border-accent-foreground border-t bg-background-dimmed px-8 py-6 max-sm:gap-4 max-sm:px-4">
      <ProviderLogo
        provider="googleMerchant"
        decorative
        fallback="none"
        className="h-10 shrink-0 rounded-none"
      />
      <span aria-hidden="true" className="font-mono text-primary-text">
        {"-->"}
      </span>
      <code className="min-w-0 break-all font-mono text-primary-text text-sm">
        https://www.googleapis.com/auth/content
      </code>
    </div>
    <SectionEnding section={section}>{children}</SectionEnding>
  </MarketingBand>
);

const Requirements = ({
  section,
  children,
  copy,
}: MarketingSection.Props & { copy: Copy }) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="grid items-center gap-8 px-8 py-10 max-sm:px-4 max-sm:py-8 md:grid-cols-[1fr_auto]">
      <div>
        <SectionHeading section={{ ...section, paragraphs: undefined }} />
      </div>
      <div className="flex items-center gap-8 max-sm:gap-6">
        <ProviderLogo
          provider="shopify"
          fallback="none"
          className="h-16 rounded-none"
        />
        <span
          aria-hidden="true"
          className="font-mono text-primary-text text-xl"
        >
          {"---->"}
        </span>
        <ProviderLogo
          provider="googleMerchant"
          fallback="none"
          className="h-16 rounded-none"
        />
      </div>
    </div>
    <div className="border-accent-foreground border-t">
      {section.paragraphs?.map((paragraph, index) => (
        <article
          key={paragraph}
          className="grid min-w-0 border-accent-foreground border-b last:border-b-0 md:grid-cols-[5fr_7fr]"
        >
          <div className="flex min-w-0 items-baseline gap-6 bg-background-dimmed px-8 py-6 max-sm:gap-4 max-sm:px-4">
            <span className="font-heading text-2xl text-primary-text">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-xl leading-snug">{copy.constraints[index]}</h3>
          </div>
          <p className="min-w-0 break-words px-8 py-6 text-foreground-dimmed leading-relaxed max-sm:px-4 md:border-accent-foreground md:border-l">
            {paragraph}
          </p>
        </article>
      ))}
    </div>
    <SectionEnding section={section}>{children}</SectionEnding>
  </MarketingBand>
);

const Setup = ({
  section,
  children,
  copy,
}: MarketingSection.Props & { copy: Copy }) => (
  <MarketingBand
    id={section.id}
    className="[&>.marketing-rail>.marketing-guides]:hidden"
  >
    <div className="px-8 py-10 max-sm:px-4 max-sm:py-8">
      <SectionHeading section={section} />
    </div>
    <GoogleMerchantCenterRoadmap section={section} copy={copy} />
    <SectionEnding section={section} showNote={false}>
      {children}
    </SectionEnding>
  </MarketingBand>
);

export const GoogleMerchantCenterBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { googleMerchantDesign: copy } = await getMessages();
  return (
    <>
      {sections.map((section, index) => (
        <Fragment key={section.id}>
          {index > 0 && <SectionGutter />}
          {(() => {
            const children = sectionChildren?.[section.id];
            switch (section.id) {
              case "workflow":
                return <Workflow section={section}>{children}</Workflow>;
              case "access":
                return <Access section={section}>{children}</Access>;
              case "requirements":
                return (
                  <Requirements section={section} copy={copy}>
                    {children}
                  </Requirements>
                );
              case "setup":
                return (
                  <Setup section={section} copy={copy}>
                    {children}
                  </Setup>
                );
              default:
                return (
                  <MarketingSection section={section}>
                    {children}
                  </MarketingSection>
                );
            }
          })()}
        </Fragment>
      ))}
    </>
  );
};
