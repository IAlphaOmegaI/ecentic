import {
  ArrowRightIcon,
  CommerceFileShieldIcon,
  CommerceGlobePointerIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { getMessages } from "next-intl/server";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import type { MarketingPage } from "@/components/marketing/page";
import {
  MarketingBand,
  MarketingHeading,
} from "@/components/marketing/primitives";
import { ProviderLogo } from "@/components/marketing/provider-logo";
import { Plus } from "@/components/plus";
import type { Sector } from "@/content/sectors";
import { Link } from "@/i18n/navigation";

export const SectorRules = async ({
  section,
  sector,
}: {
  section: MarketingPage.Section;
  sector: Sector;
}) => {
  const {
    sectorReview: { rules },
  } = await getMessages();
  const help = rules.sectors[sector];
  return (
    <MarketingBand
      id={section.id}
      className="[&>.marketing-rail>.marketing-guides]:hidden"
    >
      <MarketingHeading
        eyebrow={section.eyebrow}
        title={section.title}
        description={help.subtitle}
      />
      <div
        data-sector-help
        className="relative grid border-accent-foreground border-t md:grid-cols-[3fr_2fr]"
      >
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 left-[60%] -translate-x-1/2 -translate-y-1/2 max-md:hidden" />
        <div className="min-w-0 px-4 py-8 sm:px-8">
          <CommerceFileShieldIcon
            className="mb-6 size-8 text-primary-text"
            aria-hidden
          />
          <h3>{rules.help}</h3>
          <p className="mt-4 max-w-[58ch] text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
            {help.help}
          </p>
          <div className="mt-8 border-accent-foreground border-t pt-6">
            <p className="font-medium text-foreground-rich text-sm">
              {rules.source}
            </p>
            {section.paragraphs?.map((paragraph) => (
              <p
                key={paragraph}
                className="mt-3 max-w-[66ch] text-foreground-dimmed text-sm leading-relaxed"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
        <div className="relative min-w-0 border-accent-foreground border-t bg-background-dimmed md:border-t-0 md:border-l">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 md:hidden" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
          <CommerceFigure
            kind="inspection"
            surface="field"
            className="mx-auto aspect-[5/3] max-w-lg"
          />
          <div className="px-4 pb-8 sm:px-8">
            <div className="mb-5 flex items-center gap-5">
              {(["chatgpt", "claude", "gemini"] as const).map((provider) => (
                <ProviderLogo
                  key={provider}
                  provider={provider}
                  decorative
                  className="h-9 w-9 rounded-none object-center"
                />
              ))}
            </div>
            <p className="font-medium text-foreground-rich text-sm">
              {rules.modelLabel}
            </p>
            <p className="mt-3 text-foreground-dimmed text-sm leading-relaxed">
              {rules.models}
            </p>
          </div>
        </div>
      </div>
      {sector === "wine-and-spirits" && (
        <div
          data-sector-bespoke
          className="relative border-accent-foreground border-t bg-background-rich"
        >
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="grid items-center md:grid-cols-[3fr_2fr]">
            <div className="px-4 py-8 sm:px-8">
              <h3 className="max-w-[25ch] text-3xl">{rules.bespoke.title}</h3>
              <p className="mt-4 max-w-[60ch] text-foreground-dimmed">
                {rules.bespoke.description}
              </p>
            </div>
            <CommerceFigure
              kind="checkout"
              surface="rich"
              className="mx-auto aspect-[5/3] max-w-md"
            />
          </div>
          <ol className="relative grid border-accent-foreground border-t md:grid-cols-3">
            {rules.bespoke.steps.map((step, index) => (
              <li
                key={step.title}
                className="relative min-w-0 border-accent-foreground not-first:border-t px-4 py-8 sm:px-8 md:not-first:border-t-0 md:not-first:border-l"
              >
                <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
                <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 md:hidden" />
                <div className="mb-6 flex items-center gap-5">
                  <span className="font-heading text-3xl text-primary-text">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="h-px flex-1 bg-accent-foreground"
                    aria-hidden
                  />
                  <ArrowRightIcon
                    className="size-4 text-primary-text max-md:rotate-90"
                    aria-hidden
                  />
                </div>
                <h4 className="font-heading text-foreground-rich text-xl">
                  {step.title}
                </h4>
                <p className="mt-4 text-foreground-dimmed text-sm leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
          <div className="border-accent-foreground border-t px-4 py-6 sm:px-8">
            <Button color="primary" render={<Link href="/demo" />}>
              {rules.bespoke.action}
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="border-accent-foreground border-t px-4 py-6 sm:px-8">
        {section.note && (
          <p className="mb-5 text-foreground-dimmed text-sm">{section.note}</p>
        )}
        <ul className="grid gap-4">
          {section.links?.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 text-primary-text text-sm underline-offset-4 hover:underline"
              >
                <CommerceGlobePointerIcon
                  aria-hidden
                  className="size-6 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block">{link.label}</span>
                  <span className="mt-2 block truncate font-mono text-foreground-dimmed text-xs">
                    {new URL(link.href, "https://ecentic.ai").hostname}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingBand>
  );
};
