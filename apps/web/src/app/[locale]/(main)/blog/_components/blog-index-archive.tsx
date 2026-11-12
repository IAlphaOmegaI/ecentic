"use client";

import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@zenncore/web/components/select";
import Image from "next/image";
import type { AppConfig } from "next-intl";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useRef } from "react";
import { Link } from "@/i18n/navigation";
import { blogImage } from "@/lib/blog-image";

const pageSize = 10;
const collections = ["all", "editorial"] as const;
const orders = ["recommended", "newest"] as const;

export const BlogIndexArchive = (props: BlogIndexArchive.Props) => (
  <NuqsAdapter>
    <Archive {...props} />
  </NuqsAdapter>
);

const Archive = ({ entries, copy }: BlogIndexArchive.Props) => {
  const results = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useQueryStates(
    {
      collection: parseAsStringLiteral(collections).withDefault("all"),
      order: parseAsStringLiteral(orders).withDefault("recommended"),
      page: parseAsInteger.withDefault(1),
    },
    { history: "push" },
  );
  const changePage = (page: number) => {
    void setQuery({ page }).then(() => {
      results.current?.focus({ preventScroll: true });
      results.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  };
  const filtered = entries.filter(
    (entry) => query.collection === "all" || entry.editorial,
  );
  const ordered =
    query.order === "newest"
      ? [...filtered].sort((left, right) => right.timestamp - left.timestamp)
      : filtered;
  const pages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const page = Math.min(pages, Math.max(1, query.page));
  const visible = ordered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="order-1 min-w-0 bg-background lg:order-2">
      <div className="grid grid-cols-1 gap-4 border-accent-foreground border-b bg-background-dimmed p-4 sm:grid-cols-2 sm:p-6">
        <div className="flex min-w-0 flex-col gap-2">
          <span
            id="blog-collection-label"
            className="text-foreground-dimmed text-sm"
          >
            {copy.collection}
          </span>
          <Select
            value={query.collection}
            items={collections.map((value) => ({ value, label: copy[value] }))}
            onValueChange={(value) => {
              if (value) void setQuery({ collection: value, page: 1 });
            }}
          >
            <SelectTrigger
              aria-labelledby="blog-collection-label"
              className="w-full bg-background"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPositioner>
              <SelectPopup>
                {collections.map((value) => (
                  <SelectItem key={value} value={value}>
                    {copy[value]}
                  </SelectItem>
                ))}
              </SelectPopup>
            </SelectPositioner>
          </Select>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span
            id="blog-order-label"
            className="text-foreground-dimmed text-sm"
          >
            {copy.order}
          </span>
          <Select
            value={query.order}
            items={orders.map((value) => ({ value, label: copy[value] }))}
            onValueChange={(value) => {
              if (value) void setQuery({ order: value, page: 1 });
            }}
          >
            <SelectTrigger
              aria-labelledby="blog-order-label"
              className="w-full bg-background"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPositioner>
              <SelectPopup>
                {orders.map((value) => (
                  <SelectItem key={value} value={value}>
                    {copy[value]}
                  </SelectItem>
                ))}
              </SelectPopup>
            </SelectPositioner>
          </Select>
        </div>
      </div>
      <div
        aria-live="polite"
        className="flex items-center justify-between gap-4 border-accent-foreground border-b px-4 py-4 text-foreground-dimmed text-sm sm:px-6"
      >
        <span>
          {copy.articles}{" "}
          <span className="ml-2 text-foreground tabular-nums">
            {ordered.length}
          </span>
        </span>
        <span>
          {copy.page}{" "}
          <span className="ml-2 text-foreground tabular-nums">
            {page} / {pages}
          </span>
        </span>
      </div>
      <div
        ref={results}
        data-blog-archive="true"
        tabIndex={-1}
        className="scroll-mt-24 focus:outline-none"
      >
        {visible.map((entry) => (
          <article
            key={entry.slug}
            className="border-accent-foreground border-b"
          >
            <Link
              href={`/blog/${entry.slug}`}
              prefetch={true}
              className="group grid min-w-0 grid-cols-[80px_minmax(0,1fr)] gap-4 p-4 outline-offset-[-2px] transition-colors duration-150 hover:bg-background-dimmed focus-visible:bg-background-dimmed focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none sm:grid-cols-[120px_minmax(0,1fr)_16px] sm:gap-6 sm:p-6"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-background-dimmed">
                {entry.thumbnailUrl && (
                  <Image
                    src={blogImage(entry.thumbnailUrl)}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 120px, 80px"
                    unoptimized
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="mb-2 flex flex-wrap gap-x-4 gap-y-2 text-foreground-dimmed text-xs sm:text-sm">
                  <time dateTime={entry.isoDate}>{entry.date}</time>
                  <span>{entry.readTime}</span>
                </p>
                <h3 className="text-foreground text-lg leading-snug tracking-[-0.02em] group-hover:text-primary-text group-focus-visible:text-primary-text sm:text-[22px]">
                  {entry.title}
                </h3>
                <p className="mt-2 hidden text-foreground-dimmed text-sm leading-relaxed sm:line-clamp-2">
                  {entry.description}
                </p>
              </div>
              <ArrowRightIcon
                aria-hidden="true"
                className="hidden size-4 self-center text-primary sm:block"
              />
            </Link>
          </article>
        ))}
        {visible.length === 0 && (
          <p className="p-6 text-foreground-dimmed">{copy.empty}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 bg-background-dimmed p-4 sm:p-6">
        <Button
          color="neutral"
          disabled={page === 1}
          onClick={() => changePage(page - 1)}
        >
          <ArrowRightIcon className="size-4 rotate-180" />
          {copy.action.secondary}
        </Button>
        <Button
          color="neutral"
          disabled={page === pages}
          onClick={() => changePage(page + 1)}
        >
          {copy.action.tertiary}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export namespace BlogIndexArchive {
  export type Entry = {
    editorial: boolean;
    slug: string;
    title: string;
    description: string;
    thumbnailUrl: string | null;
    date: string;
    isoDate: string;
    timestamp: number;
    readTime: string;
  };
  export type Props = {
    entries: Entry[];
    copy: AppConfig["Messages"]["blogIndexPage"];
  };
}
