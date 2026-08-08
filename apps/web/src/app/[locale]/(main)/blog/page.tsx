import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { readingTimeMinutes } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { localizePath } from "@/i18n/locale";
import { routing, type Locale } from "@/i18n/routing";
import { createMetadata } from "@/lib/seo";
import * as BabyLoveGrowth from "@/server/app/babylovegrowth";
import * as Blog from "@/server/app/blog-cache";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialRichText,
  EditorialSplitSection,
} from "./_components/editorial-page";

const normalize = (value: Date | string) => {
  if (value instanceof Date) return value;
  return new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
};

const formatBlogDate = (value: Date | string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(normalize(value));

const toBlogIsoDate = (value: Date | string) => normalize(value).toISOString();

type IndexEntry = {
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

type BlogIndexProps = {
  params: Promise<{ locale: string }>;
};

export const generateMetadata = async ({
  params,
}: BlogIndexProps): Promise<Metadata> => {
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const translate = await getTranslations({ locale, namespace: "Blog" });

  return createMetadata({
    title: translate("title"),
    description: translate("description"),
    path: localizePath("/blog", locale),
    keywords: [
      "ecommerce SEO 2026",
      "AI shopping agents",
      "merchant listings",
      "structured data ecommerce",
      "ecommerce blog",
    ],
  });
};

export default async ({ params }: BlogIndexProps) => {
  const { locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) return null;
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "Blog" });
  const description = translate("description");

  const posts = await Blog.listPublished(locale);
  const articles =
    locale === "en" ? await BabyLoveGrowth.listArticles() : [];

  const blgSlugs = new Set(articles.map((article) => article.slug));

  const entries: IndexEntry[] = [
    ...articles.map(
      (article): IndexEntry => ({
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
      .filter((post) => locale !== "en" || !blgSlugs.has(post.slug))
      .map(
        (post): IndexEntry => ({
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
  const blogPath = localizePath("/blog", locale);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "ecentic Blog",
    description,
    url: `https://ecentic.ai${blogPath}`,
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
      datePublished: toBlogIsoDate(entry.publishedAt),
      dateModified: toBlogIsoDate(entry.updatedAt),
      url: `https://ecentic.ai${localizePath(`/blog/${entry.slug}`, locale)}`,
      keywords: entry.tags.join(", "),
      inLanguage: locale,
      author: {
        "@type": "Organization",
        name: "ecentic",
      },
    })),
  };

  return (
    <EditorialLayout
      eyebrow="Insights"
      title={translate("title")}
      meta={
        <p>
          {latest
            ? `${translate("updated")}: ${formatBlogDate(latest.updatedAt, locale)} · ${entries.length}`
            : translate("description")}
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
              {translate("allPosts")}
            </h2>
          </>
        }
        right={<EditorialRichText content={description} />}
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
                  {formatBlogDate(entry.publishedAt, locale)}
                </p>
                <p className="text-sm text-white/60">{entry.readTime}</p>
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
                  {translate("readMore")}
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
                {translate("noPosts")}
              </h2>
            </>
          }
          right={
            <p className="text-foreground-dimmed leading-relaxed">
              {translate("noPosts")}
            </p>
          }
        />
      )}

      <EditorialFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/", label: "Back to home" }}
        note={translate("description")}
      />
    </EditorialLayout>
  );
};
