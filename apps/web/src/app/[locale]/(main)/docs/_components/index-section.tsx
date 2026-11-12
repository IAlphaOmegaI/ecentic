import { cn } from "@zenncore/utils";
import type { ReactNode } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { MarketingFeatureBand } from "@/components/marketing/primitives";
import { Plus } from "@/components/plus";

export const IndexSection = ({
  id,
  number,
  title,
  description,
  children,
  gutter,
  featureTone,
}: IndexSection.Props) => {
  if (featureTone)
    return (
      <>
        {gutter && <SectionGutter />}
        <MarketingFeatureBand
          id={id}
          tone={featureTone}
          className={cn(
            featureTone === "dark" &&
              "[--color-accent-foreground:color-mix(in_oklab,var(--color-background-rich)_16%,transparent)] [--color-background-dimmed:var(--color-emphasis)] [--color-background:var(--color-emphasis-dimmed)] [--color-foreground-dimmed:color-mix(in_oklab,var(--color-background-rich)_70%,transparent)] [--color-foreground-rich:var(--color-background-rich)] [--color-foreground:var(--color-background-rich)] [--color-primary-text:var(--color-primary-rich)]",
          )}
        >
          <div className="marketing-surface relative min-w-0 border-accent-foreground border-y">
            <MarketingEdgeCrosses />
            <MarketingEdgeCrosses edge="bottom" />
            <header className="grid gap-6 border-accent-foreground border-b bg-linear-to-br from-primary/6 via-transparent to-transparent px-8 py-10 max-sm:px-4 max-sm:py-8 md:grid-cols-[1fr_2fr]">
              <div>
                <span className="mb-4 block text-3xl text-primary">
                  {number}
                </span>
                <h2>{title}</h2>
              </div>
              <p className="max-w-3xl self-end text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
                {description}
              </p>
            </header>
            {children}
          </div>
        </MarketingFeatureBand>
      </>
    );
  return (
    <section id={id} className="scroll-mt-24 border-accent-foreground border-b">
      {gutter && (
        <div className="border-accent-foreground border-b">
          <div className="mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
            <SectionGutter />
          </div>
        </div>
      )}
      <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x bg-background max-sm:w-[calc(100%-32px)]">
        <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
        <header className="border-accent-foreground border-b px-8 py-10 max-sm:px-4 max-sm:py-8">
          <span className="mb-4 block text-3xl text-primary">{number}</span>
          <h2>{title}</h2>
          <p className="mt-4 max-w-3xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
            {description}
          </p>
        </header>
        {children}
      </div>
    </section>
  );
};

export namespace IndexSection {
  export type Props = {
    id?: string;
    number: string;
    title: string;
    description: string;
    children: ReactNode;
    gutter?: boolean;
    featureTone?: "dark" | "light" | "muted";
  };
}

export const IndexQuickstartSkeleton = () => (
  <div aria-hidden="true">
    <div className="border-accent-foreground border-b px-8 py-6 max-sm:px-4">
      <div className="h-6 w-48 bg-background-dimmed" />
    </div>
    <div className="grid md:grid-cols-[4fr_7fr]">
      <div className="min-h-72 border-accent-foreground border-b bg-background md:border-r md:border-b-0" />
      <div className="min-w-0">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="border-accent-foreground border-b last:border-b-0"
          >
            <div className="flex items-center gap-6 border-accent-foreground border-b px-6 py-8 max-sm:px-2">
              <div className="size-12 shrink-0 rounded-md bg-background-dimmed" />
              <div className="h-10 w-2/3 bg-background-dimmed" />
            </div>
            <div className="px-8 py-8 max-sm:px-4">
              <div className="h-20 bg-background-dimmed" />
            </div>
            <div className="h-36 border-accent-foreground border-y bg-background-dimmed" />
            <div className="flex flex-col gap-6 px-8 py-8 max-sm:px-4">
              <div className="h-16 bg-background-dimmed" />
              <div className="h-10 w-40 bg-background-dimmed" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
