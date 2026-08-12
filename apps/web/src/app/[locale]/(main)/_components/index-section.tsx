import { ArrowRightIcon, type Icon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { ReactNode } from "react";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { Link } from "@/i18n/navigation";

// These sections used to be a 5fr/8fr split: gray prose on the left, the list
// on the right. The split did no work — both halves were prose, and the section
// header above had already carried the title and lede, so the left column read
// as a second one. The rows also used `flex-1`, so they stretched to match the
// prose column's height and ended up roughly twice as tall as their content.
//
// Now the prose merges into the header and the list runs the full width as a
// numbered index, sized to its own content.

type Animated = {
  reveal?: boolean;
  className?: string;
  children?: ReactNode;
};

const Band = ({ reveal, ...props }: Animated) =>
  reveal ? <Reveal {...props} /> : <div {...props} />;

const Line = ({ reveal, ...props }: Animated) =>
  reveal ? <RevealItem {...props} /> : <div {...props} />;

export const IndexSection = ({
  id,
  number,
  icon: SectionIcon,
  title,
  description,
  body,
  label,
  items,
  accent,
  banner,
  reveal,
}: IndexSection.Props) => (
  <section id={id} className="scroll-mt-24 border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Band reveal={reveal} className="p-6 md:p-12">
        <Line reveal={reveal}>
          <span className="font-normal text-3xl text-primary">{number}</span>
        </Line>
        <Line reveal={reveal}>
          <h2 className="mt-2 max-w-4xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            {title}
          </h2>
        </Line>
        <Line reveal={reveal}>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            {description}
          </p>
        </Line>
        {body?.map((paragraph) => (
          <Line key={paragraph} reveal={reveal}>
            <p className="mt-4 max-w-2xl font-body font-light text-foreground-dimmed leading-relaxed">
              {paragraph}
            </p>
          </Line>
        ))}
        {accent && <div className="mt-8">{accent}</div>}
      </Band>

      {banner && (
        <div className="border-accent-foreground border-t bg-background-dimmed">
          {banner}
        </div>
      )}

      <div className="relative border-accent-foreground border-t">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex items-center gap-3 border-accent-foreground border-b bg-background-dimmed px-6 py-4 md:px-8">
          {SectionIcon && (
            <SectionIcon className="size-5 shrink-0 text-primary" />
          )}
          <p className="font-medium text-foreground-dimmed text-sm uppercase tracking-[0.16em]">
            {label}
          </p>
        </div>

        <Band reveal={reveal} className="flex flex-col bg-background-rich">
          {items.map((item, index) => (
            <Line
              key={item.title}
              reveal={reveal}
              className="grid grid-cols-[2.5rem_1fr] border-accent-foreground border-b px-6 py-5 last:border-b-0 md:grid-cols-[5rem_1fr] md:px-8"
            >
              <span className="font-normal text-lg text-primary-text tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                <div className="flex flex-col gap-1">
                  <h3
                    className={cn(
                      "font-body font-medium text-xl",
                      item.mono && "font-mono",
                      item.emphasized ? "text-primary" : "text-foreground",
                    )}
                  >
                    {item.title}
                  </h3>
                  <p className="max-w-3xl font-light text-foreground-dimmed leading-relaxed">
                    {item.description}
                  </p>
                  {item.meta && (
                    <p className="mt-1 font-mono text-foreground-dimmed text-xs">
                      {item.meta}
                    </p>
                  )}
                </div>
                {item.action && (
                  <Button
                    color="accent"
                    className="w-fit shrink-0"
                    render={<Link href={item.action.href} />}
                  >
                    {item.action.label}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                )}
              </div>
            </Line>
          ))}
        </Band>
      </div>
    </div>
  </section>
);

export namespace IndexSection {
  export type Item = {
    title: string;
    description: string;
    /** Renders the title in primary — for the one row a section argues for. */
    emphasized?: boolean;
    /** Titles that are paths or filenames rather than prose. */
    mono?: boolean;
    meta?: string;
    action?: { href: string; label: string };
  };

  export type Props = {
    number: string;
    title: string;
    description: string;
    label: string;
    items: readonly Item[];
    id?: string;
    icon?: Icon;
    /** Paragraphs that used to sit in the left column, now part of the lede. */
    body?: readonly string[];
    /** Inset under the lede — chips, a CTA. */
    accent?: ReactNode;
    /** Full-bleed between the header and the list — art, a terminal block. */
    banner?: ReactNode;
    reveal?: boolean;
  };
}
