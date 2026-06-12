import { ArrowRightIcon } from "@zenncore/icons";
import { type ClassList, cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { Plus } from "@/components/plus";
import { SimpleFooter } from "@/components/simple-footer";
import Background from "@/public/images/blog.png";
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

export const ContentPageLayout = ({
  eyebrow,
  title,
  meta,
  description,
  children,
}: ContentPageLayout.Props) => (
  <main className="flex min-h-screen flex-col">
    <div className="mx-auto w-full max-w-6xl border-accent-foreground border-x">
      <Navbar />
    </div>

    <div className="border-accent-foreground border-b p-4">
      <div className="relative size-full overflow-hidden rounded-lg bg-primary">
        <Image
          src={Background}
          alt={title}
          className="absolute aspect-auto h-full w-full object-contain object-right opacity-30 brightness-0 invert"
        />
        <div className="relative z-10 mx-auto max-w-6xl border-accent-foreground border-x px-8 pt-36 pb-16">
          <p className="mb-4 font-medium text-primary text-sm uppercase tracking-[0.2em]">
            {eyebrow}
          </p>
          <h1 className="max-w-4xl font-semibold text-5xl text-white tracking-tight md:text-7xl">
            {title}
          </h1>
          {meta && <div className="mt-2 text-white">{meta}</div>}
          <p className="mt-6 max-w-3xl text-base text-white leading-relaxed md:text-lg">
            {description}
          </p>
        </div>
      </div>
    </div>

    {children}
    <SimpleFooter />
  </main>
);

export namespace ContentPageLayout {
  export type Props = {
    eyebrow: string;
    title: string;
    meta?: ReactNode;
    description: string;
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
  classList,
}: ContentPageSection.Props) => (
  <div className={cn("border-accent-foreground border-b", classList?.root)}>
    <div
      className={cn(
        "relative mx-auto grid max-w-6xl grid-cols-1 gap-px border-accent-foreground border-x bg-accent-foreground md:grid-cols-[5fr_8fr]",
        classList?.grid,
      )}
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2 hidden md:flex" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden md:flex" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 hidden md:flex" />
      <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2 hidden md:flex" />
      <div
        className={cn(
          "relative flex flex-col bg-background-dimmed p-8",
          classList?.left,
        )}
      >
        <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 hidden md:flex" />
        <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2 hidden md:flex" />
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
      <Plus className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
      <div className="flex flex-wrap items-center gap-4">
        {secondary && (
          <Button
            color="accent"
            render={<Link href={secondary.href} />}
          >
            <ArrowRightIcon className="size-4 rotate-180" />
            {secondary.label}
          </Button>
        )}

        {primary && (
          <Button
            color="primary"
            render={<Link href={primary.href} />}
          >
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
