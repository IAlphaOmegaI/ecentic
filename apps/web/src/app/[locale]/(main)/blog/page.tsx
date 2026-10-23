import { ArrowRightIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { serializeJsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { leadingTags } from "@/lib/blog-html";
import { createMetadata } from "@/lib/seo";
import * as Blog from "@/server/app/blog";
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

export const generateMetadata = async (): Promise<Metadata> => {
  const locale = await getLocale();
  const translate = await getTranslations("blog");

  // The visible H1 is `blog.heading` and the standfirst `blog.description`
  // (`blog.title` is the nav/breadcrumb label), so the search-facing copy
  // lives in its own `meta` keys. The string here is unbranded: the locale layout's
  // `"%s | ecentic"` template supplies the suffix, exactly as `brandedTitle`
  // would for a title this short.
  const metadata = createMetadata({
    image: false,
    title: translate("meta.title"),
    description: translate("meta.description"),
    path: localizePath("/blog", locale),
    keywords: [
      "ecommerce SEO 2026",
      "AI shopping agents",
      "merchant listings",
      "structured data ecommerce",
      "ecommerce blog",
    ],
  });

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: { "application/rss+xml": "/rss.xml" },
    },
  };
};

export default async () => {
  const locale = await getLocale();

  const translate = await getTranslations("blog");
  const description = translate("description");

  // Catalog lives in Postgres (webhook upserts). Index cards are `blog_post`
  // rows — not live BabyLoveGrowth list summaries.
  const [englishPosts, spanishPosts] = await Promise.all([
    Blog.listPublished("en"),
    locale === "es" ? Blog.listPublished("es") : Promise.resolve([]),
  ]);

  const spanishBySlug = new Map(
    spanishPosts.map((post) => [post.slug, post] as const),
  );

  const fromPost = (post: (typeof englishPosts)[number]): IndexEntry => ({
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
  });

  const entries: IndexEntry[] = englishPosts
    .map((post): IndexEntry => {
      if (locale === "es") {
        const spanish = spanishBySlug.get(post.slug);
        if (spanish) return fromPost(spanish);
      }
      return fromPost(post);
    })
    .sort(
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
      keywords: leadingTags(entry.tags).join(", "),
      inLanguage: locale,
      author: {
        "@type": "Organization",
        name: "ecentic",
      },
    })),
  };

  return (
    // The H1 names the topic ("…on AI shopping agents"); `blog.title` stays
    // the short "Blog" the navbar and breadcrumbs use.
    <EditorialLayout
      eyebrow={translate("eyebrow")}
      title={translate("heading.primary")}
      accent={translate("heading.accent")}
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
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
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
                {leadingTags(entry.tags).map((tag) => (
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
                {/* Ninety "Read more" links read as one link repeated, to a
                    crawler and a screen reader alike. The title rides along
                    off-screen, so each link's text names its post while the
                    visible label (and the name a voice user says) stays. */}
                <Button
                  color="primary"
                  className="self-start"
                  render={<Link href={`/blog/${entry.slug}`} prefetch={true} />}
                >
                  {translate("action.primary")}
                  <span className="sr-only">: {entry.title}</span>
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
                {translate("states.empty.primary")}
              </h2>
            </>
          }
          right={
            <p className="text-foreground-dimmed leading-relaxed">
              {translate("states.empty.primary")}
            </p>
          }
        />
      )}

      <EditorialFooter
        primary={{ href: "/sign-up", label: translate("action.tertiary") }}
        secondary={{ href: "/", label: translate("action.quaternary") }}
        note={translate("description")}
      />
    </EditorialLayout>
  );
};
