import {
  ArrowRightIcon,
  ClockIcon,
  CommerceFilePenIcon,
  CommerceFileShieldIcon,
  ShieldCheckIcon,
  UserIcon,
} from "@zenncore/icons";
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
import { MarketingSection } from "@/components/marketing/page";
import {
  MarketingActions,
  MarketingBand,
  MarketingEyebrow,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { SolutionFeatureBand } from "../feature-band";
import { EnterpriseEngagements } from "./enterprise-engagements";
import { HubFigure } from "./hub-figure";

const intakeIcons = [UserIcon, CommerceFileShieldIcon, ClockIcon] as const;

const securityDetails = [
  { Icon: CommerceFilePenIcon, tone: "primary" },
  { Icon: CommerceFileShieldIcon, tone: "secondary" },
  { Icon: ShieldCheckIcon, tone: "success" },
] as const;

export const EnterpriseBody = async ({
  sections,
  sectionChildren,
}: MarketingBodyProps) => {
  const { enterprisePage, enterpriseSolutions, hairlineEnterprise } =
    await getMessages();

  return (
    <>
      {sections.map((section) => {
        switch (section.id) {
          case "ways-to-start":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-8 sm:px-8 sm:py-12">
                  {section.eyebrow && (
                    <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                  )}
                  <h2>{section.title}</h2>
                  <p className="mt-4 max-w-[60ch] text-foreground-dimmed text-lg max-sm:text-base">
                    {enterprisePage.engagements.description}
                  </p>
                </div>
                <EnterpriseEngagements
                  items={section.items ?? []}
                  content={enterprisePage.engagements}
                  action={enterpriseSolutions.business.enterprise.actions[0]}
                />
                {sectionChildren?.[section.id]}
                {section.note && (
                  <p className="border-accent-foreground border-t px-4 py-6 text-foreground-dimmed text-sm sm:px-8">
                    {section.note}
                  </p>
                )}
              </MarketingBand>
            );
          case "measures":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="relative grid gap-px bg-accent-foreground lg:grid-cols-2">
                  <div className="flex min-w-0 flex-col bg-background-dimmed px-4 py-8 sm:px-8 sm:py-12">
                    {section.eyebrow && (
                      <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    )}
                    <h2>{section.title}</h2>
                    <p className="mt-6 max-w-[46ch] text-foreground-dimmed text-lg max-sm:text-base">
                      {enterprisePage.measures.description}
                    </p>
                    {section.note && (
                      <p className="mt-8 max-w-[55ch] border-accent-foreground border-t pt-6 text-foreground-dimmed text-sm lg:mt-auto lg:pt-8">
                        {section.note}
                      </p>
                    )}
                  </div>
                  <dl className="min-w-0 bg-background">
                    {section.items?.map((item, index) => (
                      <div
                        key={item.title}
                        className="grid grid-cols-[32px_1fr] gap-x-4 gap-y-2 border-accent-foreground border-b px-4 py-6 last:border-b-0 sm:grid-cols-[40px_1fr] sm:px-8"
                      >
                        <span
                          aria-hidden="true"
                          className="row-span-2 pt-1 text-primary-text text-sm tabular-nums"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <dt className="font-medium text-2xl text-foreground-rich tracking-tight">
                          {item.title}
                        </dt>
                        <dd className="col-start-2 m-0 max-w-[45ch] text-foreground-dimmed">
                          {item.body}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Plus className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 max-lg:hidden" />
                </div>
                {sectionChildren?.[section.id] && (
                  <div className="px-4 pb-8 sm:px-8 sm:pb-12">
                    {sectionChildren[section.id]}
                  </div>
                )}
              </MarketingBand>
            );
          case "what-we-need":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                data-enterprise-intake
                className="bg-linear-to-br from-background-rich via-background to-primary/5 [&>.marketing-rail>.marketing-guides]:hidden"
              >
                <MarketingHeading
                  eyebrow={section.eyebrow}
                  title={section.title}
                />
                <dl className="relative grid min-w-0 border-accent-foreground border-t md:grid-cols-3">
                  {section.rows?.map((row, index) => {
                    if (!row.value.trim()) return null;
                    const Icon = intakeIcons[index] ?? UserIcon;
                    return (
                      <div
                        key={row.label}
                        className="relative min-w-0 border-accent-foreground px-4 py-8 max-md:border-t max-md:first:border-t-0 sm:px-8 sm:py-10 md:border-l md:first:border-l-0"
                      >
                        {index > 0 && (
                          <>
                            <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 md:hidden" />
                            <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
                          </>
                        )}
                        <div className="mb-8 flex items-center justify-between gap-4 text-primary-text">
                          <span
                            aria-hidden
                            className="font-heading text-3xl tabular-nums"
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <Icon aria-hidden className="size-8" />
                        </div>
                        <dt className="font-heading font-medium text-2xl text-foreground-rich leading-tight tracking-tight">
                          {row.label}
                        </dt>
                        <dd className="mt-4 max-w-[46ch] text-foreground-dimmed leading-relaxed">
                          {row.value}
                          {row.detail && (
                            <p className="mt-2 text-sm">{row.detail}</p>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                  <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                  <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                  <Plus className="top-0 left-2/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                  <Plus className="bottom-0 left-1/3 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
                  <Plus className="bottom-0 left-2/3 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
                </dl>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "security":
            return (
              <Fragment key={section.id}>
                <SectionGutter />
                <MarketingBand
                  id={section.id}
                  data-nav-tone="dark"
                  data-enterprise-security
                  className="bg-emphasis-dimmed bg-radial-[at_top_right] from-primary/15 via-emphasis-dimmed to-emphasis-dimmed text-background-rich [--rail-color:color-mix(in_oklab,var(--color-background-rich)_16%,transparent)] [--rail-cross:color-mix(in_oklab,var(--color-background-rich)_32%,transparent)] [&>.marketing-rail>.marketing-guides]:hidden [&_.marketing-eyebrow]:text-primary-rich [&_:is(h2,h3)]:text-background-rich"
                >
                  <MarketingHeading
                    eyebrow={section.eyebrow}
                    title={section.title}
                    className="max-w-[52rem]"
                  />
                  <div className="relative grid min-w-0 border-[var(--rail-color)] border-t md:grid-cols-3">
                    {section.items?.map((item, index) => {
                      if (!item.body.trim()) return null;
                      const detail =
                        securityDetails[index] ?? securityDetails[0];
                      const Icon = detail.Icon;
                      return (
                        <article
                          key={item.title}
                          data-tone={detail.tone}
                          className="group/security relative min-w-0 border-[var(--rail-color)] px-4 py-8 max-md:border-t max-md:first:border-t-0 sm:px-8 sm:py-10 md:border-l md:first:border-l-0"
                        >
                          {index > 0 && (
                            <>
                              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 md:hidden" />
                              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
                            </>
                          )}
                          <Icon
                            aria-hidden
                            className="mb-8 size-8 text-primary-rich group-data-[tone=secondary]/security:text-secondary-rich group-data-[tone=success]/security:text-success-rich"
                          />
                          <h3 className="text-2xl! leading-tight">
                            {item.title}
                          </h3>
                          <p className="mt-4 max-w-[46ch] text-background-rich/75 leading-relaxed">
                            {item.body}
                          </p>
                        </article>
                      );
                    })}
                    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                    <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                    <Plus className="top-0 left-2/3 -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
                    <Plus className="bottom-0 left-1/3 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
                    <Plus className="bottom-0 left-2/3 -translate-x-1/2 translate-y-1/2 max-md:hidden" />
                  </div>
                  <div className="border-[var(--rail-color)] border-t px-4 py-8 sm:px-8">
                    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                    <MarketingActions
                      actions={section.links ?? []}
                      className="mt-0"
                    />
                  </div>
                  {sectionChildren?.[section.id]}
                </MarketingBand>
                <SectionGutter />
              </Fragment>
            );
          case "scale":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="px-4 py-8 sm:px-8 sm:py-12">
                  {section.eyebrow && (
                    <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                  )}
                  <h2>{section.title}</h2>
                </div>
                <div className="relative border-accent-foreground border-t bg-background-dimmed px-4 sm:px-8">
                  <HubFigure label={hairlineEnterprise.label} />
                  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                  <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="relative grid gap-px border-accent-foreground border-t bg-accent-foreground sm:grid-cols-2 lg:grid-cols-3">
                  {section.items?.map((item) => (
                    <article
                      key={item.title}
                      className="min-w-0 bg-background px-4 py-8 sm:px-8"
                    >
                      <h3 className="max-w-[24ch]">{item.title}</h3>
                      {item.body && (
                        <p className="mt-4 text-foreground-dimmed">
                          {item.body}
                        </p>
                      )}
                      {item.href && (
                        <Link
                          className="mt-6 inline-flex items-center gap-2 text-primary-text decoration-1 underline-offset-4 hover:underline"
                          href={item.href}
                        >
                          {item.label ?? item.title}
                          <ArrowRightIcon className="size-4" />
                        </Link>
                      )}
                    </article>
                  ))}
                  <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                  <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
                  <Plus className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 max-sm:hidden lg:hidden" />
                  <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
                  <Plus className="top-0 left-2/3 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "checklist":
            return (
              <MarketingBand
                key={section.id}
                id={section.id}
                className="[&>.marketing-rail>.marketing-guides]:hidden"
              >
                <div className="relative grid lg:grid-cols-[1fr_2fr]">
                  <div className="px-4 py-8 sm:px-8 sm:py-12">
                    {section.eyebrow && (
                      <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    )}
                    <h2>{section.title}</h2>
                  </div>
                  <Accordion className="min-w-0 border-accent-foreground lg:border-l">
                    {section.rows
                      ?.filter((row) => row.value.trim())
                      .map((row) => (
                        <AccordionItem
                          key={row.label}
                          value={row.label}
                          className="border-accent-foreground last:border-b-0 max-lg:first:border-t"
                        >
                          <AccordionTrigger
                            className="items-center px-4 py-6 text-base hover:bg-background-dimmed focus-visible:-outline-offset-4 sm:px-8"
                            classList={{
                              trigger: {
                                icon: "size-4 shrink-0 motion-reduce:transition-none",
                              },
                            }}
                          >
                            {row.label}
                          </AccordionTrigger>
                          <AccordionPanel className="motion-reduce:transition-none">
                            <div className="px-4 pb-6 sm:px-8">
                              <p className="max-w-[62ch] text-foreground-dimmed">
                                {row.value}
                              </p>
                              {row.detail && (
                                <p className="mt-2 text-sm">{row.detail}</p>
                              )}
                            </div>
                          </AccordionPanel>
                        </AccordionItem>
                      ))}
                  </Accordion>
                  <Plus className="top-0 left-1/3 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
                </div>
                {sectionChildren?.[section.id]}
              </MarketingBand>
            );
          case "pilot":
            return (
              <SolutionFeatureBand key={section.id} id={section.id}>
                <div className="border-background-rich/15 border-b">
                  <div className="px-4 py-10 sm:px-8 sm:py-12">
                    <MarketingEyebrow>{section.eyebrow}</MarketingEyebrow>
                    <h2>{section.title}</h2>
                    {section.description && (
                      <p className="mt-4 max-w-[55ch] text-background-rich/75">
                        {section.description}
                      </p>
                    )}
                  </div>
                </div>
                {sectionChildren?.[section.id]}
              </SolutionFeatureBand>
            );
          default:
            return (
              <MarketingSection key={section.id} section={section}>
                {sectionChildren?.[section.id]}
              </MarketingSection>
            );
        }
      })}
    </>
  );
};
