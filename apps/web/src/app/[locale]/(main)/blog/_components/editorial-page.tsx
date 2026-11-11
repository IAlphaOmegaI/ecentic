import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import type { ReactNode } from "react";
import { Footer } from "@/components/footer";
import { fonts } from "@/components/marketing/fonts";
import { Navbar } from "@/components/navbar";
import { Plus } from "@/components/plus";
import { Link } from "@/i18n/navigation";
import { blogImage } from "@/lib/blog-image";
import Art from "@/public/images/ascii/books.png";
import { PageBanner } from "../../_components/page-banner";
import { renderInline } from "../../_components/rich-text";

export const EditorialRichText = ({ content }: EditorialRichText.Props) => {
  const blocks = content.split(/\n\n+/);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const start = lines.findIndex((line) => line.startsWith("- "));

        if (start === -1)
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this static content renderer
            <p key={index} className="text-foreground-dimmed leading-relaxed">
              {renderInline(lines.join(" "))}
            </p>
          );

        const paragraphs = lines.slice(0, start);
        const lists = lines.slice(start);

        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this static content renderer
          <div key={index} className="flex flex-col gap-2">
            {paragraphs.length > 0 && (
              <p className="text-foreground-dimmed leading-relaxed">
                {renderInline(paragraphs.join(" "))}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {lists.map((line, innerIndex) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: split output is deterministic for this static content renderer
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

export namespace EditorialRichText {
  export type Props = {
    content: string;
  };
}

export const EditorialLayout = async ({
  eyebrow,
  title,
  meta,
  description,
  children,
}: EditorialLayout.Props) => (
  <main
    className={cn(
      fonts,
      "flex min-h-screen flex-col bg-background font-body [:where(&)_:where(h1,h2,h3,h4)]:font-heading [:where(&)_:where(h1,h2,h3,h4)]:font-medium [:where(&)_:where(strong,b)]:font-semibold",
    )}
  >
    <Navbar />

    <PageBanner
      eyebrow={eyebrow}
      title={title}
      meta={meta}
      description={description}
      art={{ source: Art, alt: "ASCII-art illustration of a stack of books" }}
    />

    {children}
    <Footer stacked />
  </main>
);

export namespace EditorialLayout {
  export type Props = {
    eyebrow: string;
    title: string;
    meta?: ReactNode;
    description: string;
    children: ReactNode;
  };
}

export const EditorialSplitSection = ({
  left,
  right,
  thumbnail,
  className,
  leftClassName,
  rightClassName,
}: EditorialSplitSection.Props) => (
  <div className={cn("border-accent-foreground border-b", className)}>
    <div className="relative mx-auto grid w-[min(1186px,calc(100%-56px))] grid-cols-1 gap-px border-accent-foreground border-x bg-accent-foreground max-sm:w-[calc(100%-32px)] md:grid-cols-[5fr_8fr]">
      {/* Sections mark only their top corners — the bottom line is owned by
          the next block (a following section or the EditorialFooter). */}
      <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
      <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
      <div
        className={cn(
          // min-w-0 lets the 5fr track shrink when the right rail has wide
          // <pre>/table content; without it the left column collapses to padding.
          "relative flex min-w-0 flex-col px-7 py-24 max-sm:px-4 max-sm:py-14",
          thumbnail ? "overflow-hidden bg-foreground-rich" : "bg-background",
          leftClassName,
        )}
      >
        {thumbnail && (
          <>
            <Image
              src={blogImage(thumbnail)}
              alt=""
              fill
              sizes="(min-width: 768px) 38vw, 100vw"
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 bg-foreground-rich/70" />
          </>
        )}
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {/* Sticky keeps the section index readable while long tables/code scroll. */}
        <div className="relative z-10 md:sticky md:top-28">{left}</div>
      </div>
      <div
        className={cn(
          "min-w-0 bg-background px-7 py-24 max-sm:px-4 max-sm:py-14",
          rightClassName,
        )}
      >
        {right}
      </div>
    </div>
  </div>
);

export namespace EditorialSplitSection {
  export type Props = {
    left: ReactNode;
    right: ReactNode;
    thumbnail?: string;
    className?: string;
    leftClassName?: string;
    rightClassName?: string;
  };
}

export const EditorialFooter = ({
  note,
  primary,
  secondary,
}: EditorialFooter.Props) => (
  <div className="border-accent-foreground border-b">
    <div className="relative mx-auto flex w-[min(1186px,calc(100%-56px))] flex-col gap-4 border-accent-foreground border-x px-7 py-8 max-sm:w-[calc(100%-32px)] max-sm:px-4 md:flex-row md:items-center md:justify-between">
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

export namespace EditorialFooter {
  export type Action = {
    href: string;
    label: string;
  };

  export type Props = {
    note?: ReactNode;
    primary?: Action;
    secondary?: Action;
  };
}
