import { ArrowRightIcon } from "@zenncore/icons";
import { unwrapResult } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import Link from "next/link";
import { createMetadata } from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";
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
  return new Date(`${value}T00:00:00Z`);
};

const formatBlogDate = (value: Date | string) =>
  formatter.format(normalize(value));

const toBlogIsoDate = (value: Date | string) => normalize(value).toISOString();

const description =
  "SEO, structured data, and AI commerce guides for merchants building modern ecommerce catalogs.";

const introduction = `The ecommerce stack in 2026 is bigger than search rankings alone. Merchants now have to think about category intent, merchant listings, structured product data, and how AI shopping systems understand catalog quality.

This blog focuses on the operator questions behind that shift: how to launch a store with better foundations, how to make products easier to compare, how to measure AI shopping traffic, and how to keep visibility tied to real commercial outcomes.`;

export const metadata: Metadata = createMetadata({
  title: "Blog",
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

export default async () => {
  const posts = await unwrapResult(Blog.listPublished(Environment.SERVER));
  const latest = posts[0] ?? null;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "écentic Blog",
    description,
    url: "https://ecentic.ai/blog",
    publisher: {
      "@type": "Organization",
      name: "écentic",
      url: "https://ecentic.ai",
      logo: {
        "@type": "ImageObject",
        url: "https://ecentic.ai/icons/icon-512.png",
      },
    },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: toBlogIsoDate(post.publishedAt),
      dateModified: toBlogIsoDate(post.updatedAt),
      url: `https://ecentic.ai/blog/${post.slug}`,
      keywords: post.tags.join(", "),
      author: {
        "@type": "Organization",
        name: "écentic",
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
            ? `Updated: ${formatBlogDate(latest.updatedAt)} · ${posts.length} guides`
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

      {posts.map((post, index) => (
        <EditorialSplitSection
          key={post.slug}
          thumbnail={post.thumbnailUrl ?? undefined}
          left={
            <>
              <span className="font-normal text-2xl text-white">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="mt-auto flex flex-col gap-2">
                <p className="font-medium text-white/70 text-sm uppercase tracking-[0.18em]">
                  {post.category}
                </p>
                <p className="text-white">{formatBlogDate(post.publishedAt)}</p>
                <p className="text-white/60 text-sm">{post.readTime} read</p>
              </div>
            </>
          }
          right={
            <div className="flex h-full flex-col gap-6">
              <div>
                <h2 className="max-w-3xl text-3xl text-foreground leading-tight md:text-4xl">
                  {post.title}
                </h2>
                <p className="mt-4 max-w-3xl text-base text-foreground-dimmed leading-relaxed md:text-lg">
                  {post.description}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {post.tags.slice(0, 3).map((tag) => (
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
                  {post.takeaways[0]}
                </p>
                <Button
                  color="primary"
                  className="self-start"
                  render={<Link href={`/blog/${post.slug}`} />}
                >
                  Read article
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          }
        />
      ))}

      {posts.length === 0 && (
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
