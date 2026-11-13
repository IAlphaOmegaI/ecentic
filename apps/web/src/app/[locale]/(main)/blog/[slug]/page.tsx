import { unwrapResult } from "@zenncore/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { localeMetadata } from "@/i18n/locales";
import {
  hasFaqSection,
  isFaqSectionTitle,
  splitBlogHtmlByH2,
} from "@/lib/blog-html";
import { blogImage } from "@/lib/blog-image";
import { blogDate, blogReadingMinutes } from "@/lib/blog-locale";
import {
  absoluteUrl,
  brandedTitle,
  createBreadcrumbSchema,
  createFaqSchema,
  seo,
} from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import { EditorialRichText } from "../_components/editorial-page";
import { ArticleLayout } from "./_components/article-layout";
import { ArticleHtml, ArticleSection } from "./_components/article-section";

const normalize = (value: Date | string) => {
  if (value instanceof Date) return value;
  return new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
};

const toBlogIsoDate = (value: Date | string) => normalize(value).toISOString();

const languageAlternates = async (slug: string) =>
  Object.fromEntries(
    (await Blog.listPublishedLocales(slug)).map((locale) => [
      locale,
      localizePath(`/blog/${slug}`, locale),
    ]),
  );

/**
 * A title tag is not an H1. Where the headline we want on the page is longer
 * than the ~60 characters Google renders, the tag gets its own copy here rather
 * than a truncation — keyed by slug, so it survives BLG re-ingesting the post.
 */
const BLOG_TITLE_TAGS: Record<string, Record<string, string>> = {
  "ecentic-eu-presence-partnership-compliance-ai-visibility-bundle": {
    en: "EU Presence Bundle: Compliance + AI Visibility",
  },
};

// Reviewed editorial title-tag overrides apply only to their authored locale.
const blogTitleTag = (post: { slug: string; title: string; locale: string }) =>
  brandedTitle(BLOG_TITLE_TAGS[post.slug]?.[post.locale] ?? post.title);

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateStaticParams = async ({
  params,
}: {
  params: { locale: string };
}) =>
  (await Blog.listPublishedPaths())
    .filter((entry) => entry.locale === params.locale)
    .map(({ slug }) => ({ slug }));

export const generateMetadata = async ({
  params,
}: BlogPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const locale = await getLocale();

  // Prefer stored rows (webhook + ISR). No live BLG on the render path.
  const resolved = await unwrapResult(
    Blog.resolve({
      slug,
      locale,
    }),
  );
  if (!resolved) return {};

  const post = resolved.post;
  const path = localizePath(`/blog/${post.slug}`, locale);

  return {
    // `absolute` so the locale layout's `"%s | ecentic"` cannot re-append a
    // suffix `brandedTitle` may have deliberately dropped.
    title: { absolute: blogTitleTag(post) },
    description: post.description,
    keywords: [...post.tags],
    alternates: {
      canonical: path,
      languages: await languageAlternates(post.slug),
    },
    openGraph: {
      type: "article",
      url: `https://ecentic.ai${path}`,
      locale: localeMetadata[locale].openGraphLocale,
      title: `${post.title} | ecentic`,
      description: post.description,
      publishedTime: toBlogIsoDate(post.publishedAt),
      modifiedTime: toBlogIsoDate(post.updatedAt),
      authors: ["ecentic"],
      section: post.category,
      tags: [...post.tags],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | ecentic`,
      description: post.description,
    },
  };
};

export default async ({ params }: BlogPageProps) => {
  const { slug } = await params;
  const locale = await getLocale();

  const [translate, { blogArticlePage }] = await Promise.all([
    getTranslations("blog"),
    getMessages(),
  ]);
  // Static / ISR — locale rows are written by the BLG webhook (or editorial);
  // `revalidateTag("blog")` regenerates these pages. No live BLG here.
  const resolved = await unwrapResult(Blog.resolve({ slug, locale }));
  if (!resolved) notFound();

  const post = resolved.post;
  const path = localizePath(`/blog/${post.slug}`, locale);

  // Stored answers and visible article content use the requested locale.
  const faqSchema = post.faqs.length > 0 ? [createFaqSchema(post.faqs)] : [];
  const thumbnail = post.thumbnailUrl ? blogImage(post.thumbnailUrl) : null;

  /**
   * BabyLoveGrowth also ships an article `jsonLd` graph, which we deliberately
   * do not adopt: its breadcrumb points at `/<slug>` rather than `/blog/<slug>`,
   * and it spells the brand "Ecentic". The pieces worth having are built here
   * from our own row instead — including the hero image, which the stored
   * `thumbnailUrl` has had all along.
   */
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: toBlogIsoDate(post.publishedAt),
    dateModified: toBlogIsoDate(post.updatedAt),
    inLanguage: locale,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    keywords: post.tags.join(", "),
    articleSection: post.category,
    ...(thumbnail
      ? {
          image: {
            "@type": "ImageObject",
            url: thumbnail.startsWith("http")
              ? thumbnail
              : absoluteUrl(thumbnail),
          },
        }
      : {}),
    author: { "@type": "Organization", name: "ecentic", url: seo.host },
    publisher: {
      "@type": "Organization",
      name: "ecentic",
      url: seo.host,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icons/icon-512.png"),
      },
    },
  };

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: translate("title"), path: localizePath("/blog", locale) },
    { name: post.title, path },
  ]);

  const structuredData = [articleSchema, breadcrumbSchema, ...faqSchema];
  const actions = {
    primary: translate("action.tertiary"),
    secondary: translate("action.secondary"),
    note: translate("description"),
  };
  const faq = post.faqs.length > 0 && (
    <ArticleSection id="article-faq" title={translate("faq.title")}>
      <dl className="flex flex-col gap-8">
        {post.faqs.map((entry) => (
          <div key={entry.question} className="flex flex-col gap-4">
            <dt className="font-medium text-foreground text-lg leading-snug">
              {entry.question}
            </dt>
            <dd>
              <EditorialRichText content={entry.answer} />
            </dd>
          </div>
        ))}
      </dl>
    </ArticleSection>
  );

  if (post.contentHtml) {
    const minutes = blogReadingMinutes(post.contentHtml, locale);
    // Classify translated body headings without adding a duplicate FAQ block.
    const sections = splitBlogHtmlByH2(post.contentHtml, post.locale);
    // Newer BabyLoveGrowth articles end in their own FAQ block; the stored
    // pairs are that same block, so rendering them again would print it twice.
    const showsFaq =
      post.faqs.length > 0 && !hasFaqSection(sections, post.locale);
    return (
      <ArticleLayout
        category={post.category}
        title={post.title}
        meta={
          <p>
            {translate("published")}: {blogDate(post.publishedAt, locale)} ·{" "}
            {translate("minRead", { minutes: String(minutes) })}
          </p>
        }
        description={post.description}
        contents={[
          ...sections.map((section, index) => ({
            id: `article-section-${index}`,
            title: section.title,
          })),
          ...(showsFaq
            ? [{ id: "article-faq", title: translate("faq.title") }]
            : []),
        ]}
        keywords={post.tags}
        copy={blogArticlePage}
        actions={actions}
      >
        <JsonLd schemas={structuredData} />
        {sections.map((section, index) => (
          <ArticleSection
            id={`article-section-${index}`}
            key={`${section.number}-${section.title}`}
          >
            <ArticleHtml html={section.html} />
          </ArticleSection>
        ))}
        {showsFaq && faq}
      </ArticleLayout>
    );
  }

  // Editorial FAQs live in `post.faqs` and render as their own block below. A
  // row still carrying the prose as a section — written before that column
  // existed — must not print the same answers a second time, which is what lets
  // the stored pairs land ahead of the code that reads them.
  const sections = post.sections.filter(
    (section) => !isFaqSectionTitle(section.title, post.locale),
  );

  return (
    <ArticleLayout
      category={post.category}
      title={post.title}
      meta={
        <p>
          {translate("published")}: {blogDate(post.publishedAt, locale)} ·{" "}
          {translate("minRead", {
            minutes: String(
              blogReadingMinutes(
                post.sections.map((section) => section.content).join("\n"),
                locale,
              ),
            ),
          })}
        </p>
      }
      description={post.description}
      thumbnail={thumbnail}
      contents={[
        ...(post.introduction
          ? [
              {
                id: "article-introduction",
                title: blogArticlePage.introduction,
              },
            ]
          : []),
        ...(post.takeaways.length > 0
          ? [{ id: "article-takeaways", title: blogArticlePage.takeaways }]
          : []),
        ...sections.map((section, index) => ({
          id: `article-section-${index}`,
          title: section.title,
        })),
        ...(post.faqs.length > 0
          ? [{ id: "article-faq", title: translate("faq.title") }]
          : []),
      ]}
      keywords={post.tags}
      copy={blogArticlePage}
      actions={actions}
    >
      <JsonLd schemas={structuredData} />
      {post.introduction && (
        <ArticleSection id="article-introduction">
          <EditorialRichText content={post.introduction} />
        </ArticleSection>
      )}
      {post.takeaways.length > 0 && (
        <ArticleSection
          id="article-takeaways"
          title={blogArticlePage.takeaways}
          summary
        >
          <ul className="flex list-disc flex-col gap-4 pl-4 marker:text-primary-text">
            {post.takeaways.map((takeaway) => (
              <li key={takeaway}>{takeaway}</li>
            ))}
          </ul>
        </ArticleSection>
      )}
      {sections.map((section, index) => (
        <ArticleSection
          id={`article-section-${index}`}
          key={section.number}
          title={section.title}
        >
          <EditorialRichText content={section.content} />
        </ArticleSection>
      ))}
      {faq}
    </ArticleLayout>
  );
};
