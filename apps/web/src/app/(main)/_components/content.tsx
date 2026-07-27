import { ArrowRightIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SectionGutter } from "@/app/(main)/dashboard/_components/grid";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Plus } from "@/components/plus";
import { PageBanner } from "./page-banner";
import { renderInline } from "./rich-text";

export const ContentPageRichText = ({
  content,
}: ContentPageRichText.Props): ReactNode => {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const start = lines.findIndex((line) => line.startsWith("- "));

        if (start === -1)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this renderer
            <p key={index} className="text-foreground-dimmed leading-relaxed">
              {renderInline(lines.join(" "))}
            </p>
          );

        const paragraphs = lines.slice(0, start);
        const lists = lines.slice(start);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this renderer
          <div key={index} className="flex flex-col gap-2">
            {paragraphs.length > 0 && (
              <p className="text-foreground-dimmed leading-relaxed">
                {renderInline(paragraphs.join(" "))}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {lists.map((line, innerIndex) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this renderer
                  key={innerIndex}
                  className="flex gap-3 text-foreground-dimmed leading-relaxed"
                >
                  <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(line.slice(2))}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export namespace ContentPageRichText {
  export type Props = {
    content: string;
  };
}

export const ContentPageBadge = ({
  logo,
  alt,
  label,
}: ContentPageBadge.Props) => (
  <span className="inline-flex items-center gap-2.5 rounded-full bg-background-rich px-4 py-2 shadow-sm ring-1 ring-foreground-rich/5">
    <Image src={logo} alt={alt} width={28} height={28} className="h-6 w-auto" />
    <span className="font-medium text-foreground text-sm">{label}</span>
  </span>
);

export namespace ContentPageBadge {
  export type Props = {
    logo: string;
    alt: string;
    label: string;
  };
}

export const ContentPageLayout = ({
  children,
  ...banner
}: ContentPageLayout.Props) => (
  <main className="flex min-h-screen flex-col">
    <div className="mx-auto w-full max-w-6xl border-accent-foreground border-x">
      <Navbar />
    </div>

    <PageBanner {...banner} />

    {children}
    <Footer stacked />
  </main>
);

export namespace ContentPageLayout {
  export type Props = PageBanner.Props & {
    children: ReactNode;
  };
}

export const splitGridSectionClassList = {
  body: "p-0",
} as const;

export const splitGridClassList = {
  root: "gap-px bg-accent-foreground",
  item: "border-0",
} as const;

export const ContentPageSection = ({
  number,
  title,
  description,
  children,
  gutter,
  classList,
}: ContentPageSection.Props) => (
  <div className={cn("border-accent-foreground border-b", classList?.root)}>
    {gutter ? (
      <div className="border-accent-foreground border-b">
        <div className="mx-auto max-w-6xl border-accent-foreground border-x">
          <SectionGutter />
        </div>
      </div>
    ) : null}
    <div
      className={cn(
        "relative mx-auto grid max-w-6xl grid-cols-1 gap-px border-accent-foreground border-x bg-accent-foreground md:grid-cols-[5fr_8fr]",
        classList?.grid,
      )}
    >
      {/* Sections mark only their top corners — the bottom line is owned by
          the next block (a following section or the ContentPageFooter). */}
      <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
      <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
      <div
        className={cn(
          "relative flex flex-col bg-background-dimmed p-8",
          classList?.left,
        )}
      >
        <span className="mt-auto font-normal text-2xl text-primary">
          {number}
        </span>
        <h2 className="text-4xl text-foreground leading-snug">{title}</h2>
        {description && (
          <p className="mt-4 max-w-sm text-foreground-dimmed leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className={cn("bg-background p-8", classList?.body)}>{children}</div>
    </div>
  </div>
);

export namespace ContentPageSection {
  export type ClassListKey = "root" | "grid" | "left" | "body";
  export type Props = {
    number: string;
    title: string;
    description?: string;
    children: ReactNode;
    gutter?: boolean;
    classList?: ClassList<ClassListKey>;
  };
}

export const ContentPageCardGrid = ({
  items,
  classList,
}: ContentPageCardGrid.Props) => (
  <div
    className={cn(
      "grid gap-px bg-accent-foreground md:grid-cols-2",
      classList?.root,
    )}
  >
    {items.map((item) => (
      <article
        key={item.href}
        className={cn(
          "flex h-full flex-col gap-4 bg-background-dimmed p-6",
          classList?.item,
        )}
      >
        {item.eyebrow && (
          <p className="font-medium text-foreground text-sm uppercase tracking-[0.18em]">
            {item.eyebrow}
          </p>
        )}
        <div className="flex flex-1 flex-col gap-3">
          <h3 className="text-2xl text-foreground leading-tight">
            {item.title}
          </h3>
          <p className="text-foreground-dimmed leading-relaxed">
            {item.description}
          </p>
        </div>
        <Button
          color={item.color ?? "accent"}
          render={<Link href={item.href} />}
        >
          {item.label}
          <ArrowRightIcon className="size-4" />
        </Button>
      </article>
    ))}
  </div>
);

export namespace ContentPageCardGrid {
  export type ClassListKey = "root" | "item";
  export type Item = {
    href: string;
    title: string;
    description: string;
    label: string;
    eyebrow?: string;
    color?: "accent" | "primary";
  };

  export type Props = {
    items: readonly Item[];
    classList?: ClassList<ClassListKey>;
  };
}

export const ContentPageFaqGrid = ({
  items,
  classList,
}: ContentPageFaqGrid.Props) => (
  <div
    className={cn(
      "grid gap-px bg-accent-foreground md:grid-cols-2",
      classList?.root,
    )}
  >
    {items.map((item) => (
      <article
        key={item.question}
        className={cn(
          "flex flex-col gap-4 bg-background-rich p-6",
          classList?.item,
        )}
      >
        <h3 className="text-2xl text-foreground leading-tight">
          {item.question}
        </h3>
        <p className="text-foreground-dimmed leading-relaxed">{item.answer}</p>
      </article>
    ))}
  </div>
);

export namespace ContentPageFaqGrid {
  export type ClassListKey = "root" | "item";
  export type Item = {
    question: string;
    answer: string;
  };

  export type Props = {
    items: readonly Item[];
    classList?: ClassList<ClassListKey>;
  };
}

export const ContentPageFooter = ({
  primary,
  secondary,
  note,
}: ContentPageFooter.Props) => (
  <div className="border-accent-foreground border-b">
    <div className="relative mx-auto flex max-w-6xl flex-col gap-4 border-accent-foreground border-x px-8 py-8 md:flex-row md:items-center md:justify-between">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <div className="flex flex-wrap items-center gap-4">
        {secondary && (
          <Button color="accent" render={<Link href={secondary.href} />}>
            <ArrowRightIcon className="size-4 rotate-180" />
            {secondary.label}
          </Button>
        )}

        {primary && (
          <Button color="primary" render={<Link href={primary.href} />}>
            {primary.label}
            <ArrowRightIcon className="size-4" />
          </Button>
        )}
      </div>

      {note && <p className="text-foreground-dimmed text-sm">{note}</p>}
    </div>
  </div>
);

export namespace ContentPageFooter {
  export type Action = {
    href: string;
    label: string;
  };

  export type Props = {
    primary?: Action;
    secondary?: Action;
    note?: ReactNode;
  };
}
