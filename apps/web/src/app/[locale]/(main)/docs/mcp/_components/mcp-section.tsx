import type { ReactNode } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { Plus } from "@/components/plus";

export const McpSection = ({
  id,
  number,
  title,
  description,
  children,
  gutter,
}: McpSection.Props) => (
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

export namespace McpSection {
  export type Props = {
    id: string;
    number: string;
    title: string;
    description: string;
    children: ReactNode;
    gutter?: boolean;
  };
}
