import type { ReactNode } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { Plus } from "@/components/plus";

export const LimitsSection = ({
  number,
  title,
  description,
  children,
  gutter,
}: LimitsSection.Props) => (
  <section className="border-accent-foreground border-b">
    {gutter && (
      <div className="border-accent-foreground border-b">
        <div className="mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
          <SectionGutter />
        </div>
      </div>
    )}
    <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div className="border-accent-foreground border-b px-8 py-12 max-sm:px-4 max-sm:py-10">
        <span className="mb-4 block text-3xl text-primary">{number}</span>
        <h2 className="text-foreground-rich">{title}</h2>
        <p className="mt-4 max-w-2xl text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
          {description}
        </p>
      </div>
      {children}
    </div>
  </section>
);

export namespace LimitsSection {
  export type Props = {
    number: string;
    title: string;
    description: string;
    children: ReactNode;
    gutter?: boolean;
  };
}
