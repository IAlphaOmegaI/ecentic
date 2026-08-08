import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { readingTimeMinutes } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import Link from "next/link";
import { createMetadata } from "@/lib/seo";
import * as BabyLoveGrowth from "@/server/app/babylovegrowth";
import * as Blog from "@/server/app/blog-cache";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialRichText,
  EditorialSplitSection,
} from "./_components/editorial-page";

const formatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const normalize = (value: Date | string) => {
  if (value instanceof Date) return value;
  return new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
};

const formatBlogDate = (value: Date | string) =>
  formatter.format(normalize(value));

const toBlogIsoDate = (value: Date | string) => normalize(value).toISOString();

const description =
  "SEO, structured data, and AI commerce guides for merchants building modern ecommerce catalogs. Learn how to launch, optimize, and measure AI-driven traffic.";

const introduction = `The ecommerce stack in 2026 is bigger than search rankings alone. Merchants now have to think about category intent, merchant listings, structured product data, and how AI shopping systems understand catalog quality.

This blog focuses on the operator questions behind that shift: how to launch a store with better foundations, how to make products easier to compare, how to measure AI shopping traffic, and how to keep visibility tied to real commercial outcomes.`;

export const metadata: Metadata = createMetadata({
  title: "Ecommerce SEO and AI Commerce Guides for Merchants",
  description,
  path: "/blog",
  keywords: [
    "ecommerce SEO 2026",
    "AI shopping agents",
    "merchant listings",
    "structured data ecommerce",
    "ecommerce blog",
  ],
});

type IndexEntry =
  | {
      kind: "blg";
      slug: string;
      title: string;
      description: string;
      publishedAt: string;
      updatedAt: string;
      thumbnailUrl: string | null;
      tags: readonly string[];
      readTime: string;
      category: string;
      takeaway: string;
    }
  | {
      kind: "db";
      slug: string;
      title: string;
      description: string;
      publishedAt: Date | string;
      updatedAt: Date | string;
      thumbnailUrl: string | null;
      tags: readonly string[];
      readTime: string;
      category: string;
      takeaway: string;
    };

export default async () => {
  const [articles, posts] = await Promise.all([
    BabyLoveGrowth.listArticles(),
    Blog.listPublished(),
  ]);

  const blgSlugs = new Set(articles.map((article) => article.slug));

  const entries: IndexEntry[] = [
    ...articles.map(
      (article): IndexEntry => ({
        kind: "blg",
        slug: article.slug,
        title: article.title,
        description: article.meta_description || article.excerpt,
        publishedAt: article.created_at,
        updatedAt: article.updated_at,
        thumbnailUrl: article.hero_image_url || null,
        tags: article.keywords,
        readTime: `${Math.max(1, readingTimeMinutes(article.excerpt))} min`,
        category: article.seedKeyword ?? "Guide",
        takeaway: article.excerpt,
      }),
    ),
    ...posts
      .filter((post) => !blgSlugs.has(post.slug))
      .map(
        (post): IndexEntry => ({
          kind: "db",
          slug: post.slug,
          title: post.title,
          description: post.description,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          thumbnailUrl: post.thumbnailUrl,
          tags: post.tags,
          readTime: post.readTime,
          category: post.category,
          takeaway: post.takeaways[0] ?? post.description,
        }),
      ),
  ].sort(
    (left, right) =>
      normalize(right.publishedAt).getTime() -
      normalize(left.publishedAt).getTime(),
  );

  const latest = entries[0] ?? null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "ecentic Blog",
    description,
    url: "https://ecentic.ai/blog",
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
      datePublished: toBlogIsoDate(entry.publishedAt),
      dateModified: toBlogIsoDate(entry.updatedAt),
      url: `https://ecentic.ai/blog/${entry.slug}`,
      keywords: entry.tags.join(", "),
      author: {
        "@type": "Organization",
        name: "ecentic",
      },
    })),
  };

  return (
    <EditorialLayout
      eyebrow="Insights"
      title="Blog"
      meta={
        <p>
          {latest
            ? `Updated: ${formatBlogDate(latest.updatedAt)} · ${entries.length} guides`
            : "Fresh guides for search, shopping, and AI commerce"}
        </p>
      }
      description={description}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be rendered inline for search engines
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <EditorialSplitSection
        left={
          <>
            <span className="mt-auto font-normal text-2xl text-primary">
              00
            </span>
            <h2 className="text-4xl text-foreground leading-snug">
              What this blog covers
            </h2>
          </>
        }
        right={<EditorialRichText content={introduction} />}
      />

      {entries.map((entry, index) => (
        <EditorialSplitSection
          key={entry.slug}
          thumbnail={entry.thumbnailUrl ?? undefined}
          left={
            <>
              <span className="font-normal text-2xl text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-auto flex flex-col gap-2">
                <p className="font-medium text-sm text-white/70">
                  {entry.category}
                </p>
                <p className="text-white">
                  {formatBlogDate(entry.publishedAt)}
                </p>
                <p className="text-sm text-white/60">{entry.readTime} read</p>
              </div>
            </>
          }
          right={
            <div className="flex h-full flex-col gap-6">
              <div>
                <h2 className="max-w-3xl text-3xl text-foreground leading-tight md:text-4xl">
                  {entry.title}
                </h2>
                <p className="mt-4 max-w-3xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
                  {entry.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {entry.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="border border-accent-foreground bg-background-dimmed p-2 text-foreground-dimmed text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex flex-col gap-4">
                <p className="max-w-2xl text-foreground-dimmed leading-relaxed">
                  {entry.takeaway}
                </p>
                <Button
                  color="primary"
                  className="self-start"
                  render={<Link href={`/blog/${entry.slug}`} prefetch={true} />}
                >
                  Read article
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          }
        />
      ))}

      {entries.length === 0 && (
        <EditorialSplitSection
          left={
            <>
              <span className="mt-auto font-normal text-2xl text-primary">
                01
              </span>
              <h2 className="text-4xl text-foreground leading-snug">
                No posts yet
              </h2>
            </>
          }
          right={
            <p className="text-foreground-dimmed leading-relaxed">
              Blog posts will appear here as soon as content is published.
            </p>
          }
        />
      )}

      <EditorialFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/", label: "Back to home" }}
        note="Built for merchants improving search, shopping, and AI visibility."
      />
    </EditorialLayout>
  );
};
