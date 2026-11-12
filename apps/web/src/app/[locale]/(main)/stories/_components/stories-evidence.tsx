import {
  ArrowRightIcon,
  CheckBadgeIcon,
  FileSearchIcon,
  TrendUpIcon,
} from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import type { MarketingPage } from "@/components/marketing/page";
import { Link } from "@/i18n/navigation";

/** A single published aggregate, with its evidence and limits visible beside it. */
export const StoriesEvidence = ({
  title,
  figure,
  metric,
  period,
  note,
  method,
  permission,
  confirmed,
  source,
  sourceLabel,
  sections,
  action,
}: StoriesEvidence.Props) => (
  <div data-stories-evidence className="relative min-w-0">
    <section
      aria-label={title}
      data-nav-tone="dark"
      className="relative isolate border-background-rich/20 border-y bg-emphasis-dimmed px-8 py-10 text-background-rich [--rail-cross:var(--color-background-rich)] max-sm:px-4 max-sm:py-8"
    >
      <MarketingEdgeCrosses />
      <MarketingEdgeCrosses edge="bottom" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-1 bg-radial-[at_65%_20%] from-primary/25 via-primary/5 to-transparent"
      />
      <p className="mb-8 flex items-center gap-3 text-background-rich/75 text-sm">
        <TrendUpIcon aria-hidden className="size-4 text-primary-rich" />
        {sections.find((section) => section.id === "result")?.title}
      </p>
      <div className="grid items-end gap-8 md:grid-cols-[1fr_1fr]">
        <p className="whitespace-nowrap font-body font-medium text-[clamp(6rem,14vw,11rem)] proportional-nums leading-none tracking-[-0.07em]">
          {figure}
        </p>
        <div className="min-w-0 pb-2">
          <p className="max-w-[28ch] font-heading text-3xl leading-tight max-sm:text-2xl">
            {metric}
          </p>
          <p className="mt-6 text-primary-rich">{period}</p>
        </div>
      </div>
      <p className="mt-10 max-w-[90ch] border-background-rich/20 border-t pt-6 text-background-rich/75 text-sm leading-relaxed">
        {note}
      </p>
    </section>
    <div className="grid md:grid-cols-[1.2fr_1fr]">
      {sections
        .filter((section) => section.id !== "result")
        .map((section) => {
          const isMethod = section.id === "method";
          const Icon = isMethod ? FileSearchIcon : CheckBadgeIcon;
          return (
            <section
              key={section.id}
              className="relative min-w-0 px-8 py-10 max-sm:px-4 max-md:border-accent-foreground max-md:border-b max-md:last:border-b-0 md:first:border-accent-foreground md:first:border-r"
            >
              <Icon aria-hidden className="mb-6 size-8 text-primary-text" />
              <h3 className="font-heading text-2xl! leading-tight!">
                <Link
                  href={`${action.href}#${section.id}`}
                  className="group inline-flex items-center gap-4 hover:text-primary-text focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4"
                >
                  {section.title}
                  <ArrowRightIcon
                    aria-hidden
                    className="size-4 shrink-0 text-primary-text"
                  />
                </Link>
              </h3>
              {isMethod ? (
                <p className="mt-4 max-w-[54ch] text-foreground-dimmed leading-relaxed">
                  {method}
                </p>
              ) : (
                <>
                  <p className="mt-4 font-medium text-foreground-rich">
                    {permission}
                  </p>
                  <p className="mt-3 max-w-[44ch] text-foreground-dimmed leading-relaxed">
                    {confirmed}
                  </p>
                </>
              )}
            </section>
          );
        })}
    </div>
    <footer className="relative flex flex-wrap items-center justify-between gap-6 border-accent-foreground border-t px-8 py-6 max-sm:px-4">
      <p className="max-w-[60ch] text-foreground-dimmed text-sm leading-relaxed">
        <span className="mb-1 block font-medium text-foreground-rich">
          {sourceLabel}
        </span>
        {source}
      </p>
      <Button render={<Link href={`${action.href}#result`} />}>
        {action.label}
        <ArrowRightIcon aria-hidden className="size-4" />
      </Button>
    </footer>
  </div>
);

export namespace StoriesEvidence {
  export type Props = {
    title: string;
    figure: string;
    metric: string;
    period: string;
    note: string;
    method: string;
    permission: string;
    confirmed: string;
    source: string;
    sourceLabel: string;
    sections: readonly Pick<MarketingPage.Section, "id" | "title">[];
    action: MarketingPage.Action;
  };
}
