import { ArrowRightIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { ReactNode } from "react";
import { SectionGutter } from "@/app/[locale]/(main)/dashboard/_components/grid";
import { MarketingShell } from "@/components/marketing/page";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
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
  <span className="inline-flex items-center gap-3 rounded-md bg-background-rich px-3 py-2 text-foreground">
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

export const ContentPageLayout = async ({
  children,
  ...banner
}: ContentPageLayout.Props) => (
  <MarketingShell>
    <PageBanner {...banner} />
    {children}
  </MarketingShell>
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
        <div className="mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
          <SectionGutter />
        </div>
      </div>
    ) : null}
    <div
      className={cn(
        "relative mx-auto grid w-[min(1186px,calc(100%-56px))] grid-cols-1 gap-px border-accent-foreground border-x bg-accent-foreground max-sm:w-[calc(100%-32px)] md:grid-cols-[5fr_8fr]",
        classList?.grid,
      )}
    >
      {/* Sections mark only their top corners — the bottom line is owned by
          the next block (a following section or the ContentPageFooter). */}
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <div
        className={cn(
          "relative flex min-w-0 flex-col bg-background px-7 py-16 max-sm:px-4 max-sm:py-10",
          classList?.left,
        )}
      >
        <span className="mb-4 font-normal text-3xl text-primary">{number}</span>
        <h2 className="text-foreground-rich">{title}</h2>
        {description && (
          <p className="mt-4 max-w-sm text-foreground-dimmed text-lg leading-relaxed max-sm:text-base">
            {description}
          </p>
        )}
      </div>
      <div
        className={cn(
          "min-w-0 bg-background px-7 py-16 max-sm:px-4 max-sm:py-10",
          classList?.body,
        )}
      >
        {children}
      </div>
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
          "flex h-full flex-col gap-6 bg-background px-7 py-6 max-sm:px-4",
          classList?.item,
        )}
      >
        {item.eyebrow && (
          <p className="flex items-center gap-2 font-medium text-primary-text text-sm">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-primary"
            />
            {item.eyebrow}
          </p>
        )}
        <div className="flex flex-1 flex-col gap-6">
          <h3 className="text-2xl text-foreground-rich leading-tight">
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
          "flex flex-col gap-6 bg-background px-7 py-6 max-sm:px-4",
          classList?.item,
        )}
      >
        <h3 className="text-2xl text-foreground-rich leading-tight">
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
    <div className="relative mx-auto flex w-[min(1186px,calc(100%-56px))] flex-col gap-4 border-accent-foreground border-x px-7 py-8 max-sm:w-[calc(100%-32px)] max-sm:px-4 md:flex-row md:items-center md:justify-between">
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
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
