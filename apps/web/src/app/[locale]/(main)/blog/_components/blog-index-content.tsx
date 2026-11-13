import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import {
  MarketingEdgeCrosses,
  MarketingLightBand,
} from "@/components/marketing/light-band";
import { Plus } from "@/components/plus";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { blogImage } from "@/lib/blog-image";
import { blogDate, blogReadingMinutes, blogTopicSlug } from "@/lib/blog-locale";
import * as Blog from "@/server/app/blog";
import { SectionGutter } from "../../dashboard/_components/grid";
import { BlogIndexArchive } from "./blog-index-archive";

const normalize = (value: Date | string) => {
  if (value instanceof Date) return value;
  return new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
};

export const BlogIndexContent = async () => {
  const locale = await getLocale();
  const [translate, messages, posts] = await Promise.all([
    getTranslations("blog"),
    getMessages(),
    Blog.listPublished(locale),
  ]);
  const copy = messages.blogIndexPage;
  const entries = posts.sort(
    (left, right) =>
      Number(right.source === "local") - Number(left.source === "local") ||
      normalize(right.publishedAt).getTime() -
        normalize(left.publishedAt).getTime(),
  );
  const chronological = [...entries].sort(
    (left, right) =>
      normalize(right.publishedAt).getTime() -
      normalize(left.publishedAt).getTime(),
  );
  const featured = entries[0];
  const latest = chronological[0];
  const recent = chronological
    .filter((entry) => entry.slug !== featured?.slug)
    .slice(0, 3);
  const topics = [
    ...new Map(
      entries.flatMap((entry) =>
        entry.tags.map((label) => [blogTopicSlug(label), label] as const),
      ),
    ).entries(),
  ]
    .map(([slug, label]) => ({
      label,
      slug,
      count: entries.filter((entry) =>
        entry.tags.some((tag) => blogTopicSlug(tag) === slug),
      ).length,
    }))
    .filter((topic) => topic.slug)
    .sort((left, right) => right.count - left.count)
    .slice(0, 7);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `ecentic ${translate("title")}`,
    description: translate("description"),
    url: `https://ecentic.ai${localizePath("/blog", locale)}`,
    inLanguage: locale,
    publisher: {
      "@type": "Organization",
      name: "ecentic",
      url: "https://ecentic.ai",
      logo: {
        "@type": "ImageObject",
        url: "https://ecentic.ai/icons/icon-512.png",
      },
    },
    blogPost: entries.map((entry) => ({
      "@type": "BlogPosting",
      headline: entry.title,
      description: entry.description,
      datePublished: normalize(entry.publishedAt).toISOString(),
      dateModified: normalize(entry.updatedAt).toISOString(),
      url: `https://ecentic.ai${localizePath(`/blog/${entry.slug}`, locale)}`,
      keywords: entry.tags.join(", "),
      inLanguage: locale,
      author: { "@type": "Organization", name: "ecentic" },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {featured ? (
        <MarketingLightBand aria-labelledby="blog-featured">
          <div className="relative grid gap-px bg-accent-foreground lg:grid-cols-[2fr_1fr]">
            <article className="min-w-0 bg-background">
              <Link
                href={`/blog/${featured.slug}`}
                prefetch={true}
                className="group block outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-primary"
              >
                {featured.thumbnailUrl && (
                  <div className="relative aspect-[16/9] overflow-hidden bg-background-dimmed">
                    <Image
                      src={blogImage(featured.thumbnailUrl)}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 790px, 100vw"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="relative p-4 sm:p-8">
                  {featured.thumbnailUrl && <MarketingEdgeCrosses />}
                  <p
                    id="blog-featured"
                    className="mb-4 text-primary-text text-sm"
                  >
                    {copy.featured}
                  </p>
                  <h2 className="max-w-3xl text-3xl text-foreground leading-[1.1] tracking-[-0.035em] group-hover:text-primary-text group-focus-visible:text-primary-text sm:text-[42px]">
                    {featured.title}
                  </h2>
                  <p className="mt-4 max-w-2xl text-base text-foreground-dimmed leading-relaxed">
                    {featured.description}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-foreground-dimmed text-sm">
                    <time
                      dateTime={normalize(featured.publishedAt).toISOString()}
                    >
                      {blogDate(featured.publishedAt, locale)}
                    </time>
                    <span>{featured.readTime}</span>
                    <span className="ml-auto inline-flex items-center gap-2 text-primary-text">
                      {translate("action.primary")}
                      <ArrowRightIcon aria-hidden="true" className="size-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </article>
            <aside className="relative flex min-w-0 flex-col bg-background-dimmed">
              <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
              <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2 max-lg:hidden" />
              <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2 lg:hidden" />
              <div className="relative border-accent-foreground border-b p-4 sm:p-8">
                <MarketingEdgeCrosses edge="bottom" />
                <h2 className="text-2xl text-foreground tracking-[-0.02em]">
                  {copy.latest}
                </h2>
                {latest && (
                  <p className="mt-2 text-foreground-dimmed text-sm">
                    {translate("updated")}: {blogDate(latest.updatedAt, locale)}
                  </p>
                )}
              </div>
              {recent.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/blog/${entry.slug}`}
                  prefetch={true}
                  className="group relative flex min-w-0 flex-1 flex-col gap-4 border-accent-foreground border-b p-4 outline-offset-[-2px] transition-colors duration-150 hover:bg-background focus-visible:bg-background focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none sm:p-8"
                >
                  <MarketingEdgeCrosses edge="bottom" />
                  <p className="flex flex-wrap gap-x-4 gap-y-2 text-foreground-dimmed text-sm">
                    <time dateTime={normalize(entry.publishedAt).toISOString()}>
                      {blogDate(entry.publishedAt, locale)}
                    </time>
                    <span>
                      {translate("minRead", {
                        minutes: String(
                          blogReadingMinutes(
                            entry.contentHtml ??
                              entry.sections
                                .map((section) => section.content)
                                .join("\n"),
                            locale,
                          ),
                        ),
                      })}
                    </span>
                  </p>
                  <h3 className="text-foreground text-xl leading-snug tracking-[-0.02em] group-hover:text-primary-text group-focus-visible:text-primary-text">
                    {entry.title}
                  </h3>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-4 text-primary"
                  />
                </Link>
              ))}
              <div className="p-4 sm:p-8">
                <Button color="neutral" render={<Link href="#blog-archive" />}>
                  {copy.action.primary}
                  <ArrowRightIcon className="size-4 rotate-90" />
                </Button>
              </div>
            </aside>
          </div>
        </MarketingLightBand>
      ) : (
        <div className="mx-auto w-[min(1186px,calc(100%-32px))] border-accent-foreground border-x p-8 text-foreground-dimmed">
          {translate("states.empty.primary")}
        </div>
      )}
      <SectionGutter />
      <section
        id="blog-archive"
        aria-labelledby="blog-archive-heading"
        className="scroll-mt-24 border-accent-foreground border-y"
      >
        <div className="relative mx-auto w-[min(1186px,calc(100%-56px))] border-accent-foreground border-x max-sm:w-[calc(100%-32px)]">
          <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
          <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
          <div className="border-accent-foreground border-b px-4 py-8 sm:p-8">
            <h2
              id="blog-archive-heading"
              className="text-3xl text-foreground leading-tight tracking-[-0.03em] sm:text-4xl"
            >
              {copy.archive}
            </h2>
            <p className="mt-4 max-w-2xl text-foreground-dimmed leading-relaxed">
              {copy.archiveDescription}
            </p>
          </div>
          <div className="grid gap-px bg-accent-foreground lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="order-2 min-w-0 bg-background-dimmed lg:order-1">
              <div className="lg:sticky lg:top-24">
                <div className="p-4 sm:p-6">
                  <h3 className="text-foreground text-xl">{copy.topics}</h3>
                  <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
                    {copy.topicsDescription}
                  </p>
                </div>
                <nav
                  aria-label={copy.topics}
                  className="grid grid-cols-1 border-accent-foreground border-t sm:grid-cols-2 lg:grid-cols-1"
                >
                  {topics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/blog/tag/${topic.slug}`}
                      className="flex min-w-0 items-center justify-between gap-4 border-accent-foreground border-b px-4 py-4 text-foreground text-sm outline-offset-[-2px] transition-colors duration-150 hover:bg-background hover:text-primary-text focus-visible:bg-background focus-visible:text-primary-text focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none sm:px-6"
                    >
                      <span>{topic.label}</span>
                      <ArrowRightIcon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                    </Link>
                  ))}
                </nav>
                <div className="p-4 sm:p-6">
                  <Button color="neutral" render={<Link href="/resources" />}>
                    {copy.action.quaternary}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </aside>
            <Suspense
              fallback={<BlogIndexSkeleton label={copy.loading} compact />}
            >
              <BlogIndexArchive
                copy={copy}
                entries={entries.map((entry) => ({
                  editorial: entry.source === "local",
                  slug: entry.slug,
                  title: entry.title,
                  description: entry.description,
                  thumbnailUrl: entry.thumbnailUrl,
                  date: blogDate(entry.publishedAt, locale),
                  isoDate: normalize(entry.publishedAt).toISOString(),
                  timestamp: normalize(entry.publishedAt).getTime(),
                  readTime: translate("minRead", {
                    minutes: String(
                      blogReadingMinutes(
                        entry.contentHtml ??
                          entry.sections
                            .map((section) => section.content)
                            .join("\n"),
                        locale,
                      ),
                    ),
                  }),
                }))}
              />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
};

export const BlogIndexSkeleton = ({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) => (
  <div
    role="status"
    aria-label={label}
    className={
      compact
        ? "min-h-[640px] bg-background p-6"
        : "mx-auto min-h-[640px] w-[min(1186px,calc(100%-32px))] border-accent-foreground border-x p-6"
    }
  >
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="h-64 bg-background-dimmed" />
    <div aria-hidden="true" className="mt-8 h-8 w-3/4 bg-background-dimmed" />
    <div aria-hidden="true" className="mt-4 h-4 w-full bg-background-dimmed" />
    <div aria-hidden="true" className="mt-4 h-4 w-2/3 bg-background-dimmed" />
  </div>
);
