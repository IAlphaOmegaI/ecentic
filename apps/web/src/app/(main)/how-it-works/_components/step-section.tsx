import type { Icon } from "@zenncore/icons";
import type { ReactNode } from "react";
import { Plus } from "@/components/plus";

type Item = {
  title: string;
  description: string;
};

export const StepSection = ({
  id,
  number,
  icon: StepIcon,
  title,
  subheading,
  paragraph,
  itemsLabel,
  items,
  accent,
}: StepSection.Props) => (
  <section id={id} className="scroll-mt-24 border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">{number}</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          {subheading}
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        <div className="flex flex-col gap-6 bg-background-dimmed p-6 md:p-8">
          <StepIcon className="size-8 text-primary" />
          <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
            {paragraph}
          </p>
          {accent && <div className="mt-auto">{accent}</div>}
        </div>
        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-foreground-dimmed text-sm uppercase tracking-[0.18em] md:px-8">
            {itemsLabel}
          </p>
          {items.map((item) => (
            <div
              key={item.title}
              className="flex flex-1 flex-col gap-1 bg-background-rich px-6 py-5 md:px-8"
            >
              <h3 className="font-body font-medium text-foreground text-xl">
                {item.title}
              </h3>
              <p className="font-light text-foreground-dimmed leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export namespace StepSection {
  export type Props = {
    id: string;
    number: string;
    icon: Icon;
    title: string;
    subheading: string;
    paragraph: string;
    itemsLabel: string;
    items: readonly Item[];
    accent?: ReactNode;
  };
}
