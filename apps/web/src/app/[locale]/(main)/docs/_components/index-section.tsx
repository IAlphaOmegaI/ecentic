import type { ReactNode } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { Plus } from "@/components/plus";

export const IndexSection = ({
  id,
  number,
  title,
  description,
  children,
  gutter,
}: IndexSection.Props) => (
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

export namespace IndexSection {
  export type Props = {
    id: string;
    number: string;
    title: string;
    description: string;
    children: ReactNode;
    gutter?: boolean;
  };
}

export const IndexQuickstartSkeleton = () => (
  <div aria-hidden="true">
    <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-8 py-6 max-sm:px-4">
      <div className="h-6 w-48 bg-background-dimmed" />
      <div className="h-10 w-60 rounded-lg bg-background-dimmed" />
    </div>
    <div className="grid gap-px bg-accent-foreground md:grid-cols-[4fr_7fr]">
      <div className="min-h-72 bg-background-dimmed" />
      <div className="flex min-h-96 flex-col gap-6 bg-background p-8 max-sm:p-4">
        <div className="h-8 w-2/3 bg-background-dimmed" />
        <div className="h-16 bg-background-dimmed" />
        <div className="h-28 bg-background-dimmed" />
        <div className="h-10 w-32 bg-background-dimmed" />
      </div>
    </div>
  </div>
);
