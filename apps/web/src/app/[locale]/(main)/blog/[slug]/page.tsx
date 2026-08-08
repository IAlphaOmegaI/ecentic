import { resultify } from "@zenncore/utils";
import { readingTimeMinutes } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import * as BabyLoveGrowth from "@/server/app/babylovegrowth";
import * as Blog from "@/server/app/blog-cache";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialRichText,
  EditorialSplitSection,
} from "../_components/editorial-page";
import { TagList } from "../_components/tag-list";
import "../blog-content.css";

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

const languageAlternates = (slug: string) => ({
  en: `/blog/${slug}`,
  es: `/es/blog/${slug}`,
});

type BlogPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export const generateStaticParams = async () => {
  const [articles, english, spanish] = await Promise.all([
    BabyLoveGrowth.listArticles(),
    Blog.listPublished("en"),
    Blog.listPublished("es"),
  ]);

  const englishSlugs = new Set([
    ...articles.map((article) => article.slug),
    ...english.map((post) => post.slug),
  ]);
  const spanishSlugs = new Set(spanish.map((post) => post.slug));

  return [
    ...[...englishSlugs].map((slug) => ({ locale: "en", slug })),
    ...[...spanishSlugs].map((slug) => ({ locale: "es", slug })),
  ];
};

export const generateMetadata = async ({
  params,
}: BlogPageProps): Promise<Metadata> => {
  const { slug, locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;

  if (locale === "en") {
    const blg = await resultify(() => BabyLoveGrowth.getArticleBySlug(slug));
    if (blg.success && blg.data) {
      const article = blg.data;
      const path = `/blog/${article.slug}`;
      return {
        title: article.title,
        description: article.meta_description,
        keywords: article.keywords,
        alternates: {
          canonical: path,
          languages: languageAlternates(article.slug),
        },
        openGraph: {
          type: "article",
          url: `https://ecentic.ai${path}`,
          locale: "en_US",
          title: `${article.title} | ecentic`,
          description: article.meta_description,
          publishedTime: article.created_at,
          modifiedTime: article.updated_at,
          authors: ["ecentic"],
          images: article.hero_image_url
            ? [{ url: article.hero_image_url }]
            : undefined,
        },
        twitter: {
          card: "summary_large_image",
          title: `${article.title} | ecentic`,
          description: article.meta_description,
        },
      };
    }
  }

  const result = await resultify(() => Blog.getPublishedBySlug(slug, locale));
  if (!result.success || !result.data) return {};

  const post = result.data;
  const path = localizePath(`/blog/${post.slug}`, locale);

  return {
    title: post.title,
    description: post.description,
    keywords: [...post.tags],
    alternates: {
      canonical: path,
      languages: languageAlternates(post.slug),
    },
    openGraph: {
      type: "article",
      url: `https://ecentic.ai${path}`,
      locale: locale === "es" ? "es_ES" : "en_US",
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
  const { slug, locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;
  setRequestLocale(locale);

  const translate = await getTranslations({ locale, namespace: "Blog" });

  if (locale === "en") {
    const article = await BabyLoveGrowth.getArticleBySlug(slug);
    if (article) {
      const minutes = Math.max(
        1,
        readingTimeMinutes(article.content_markdown || article.content_html),
      );

      const structuredData = [
        ...(article.jsonLd ? [article.jsonLd] : []),
        ...(article.faqJsonLd ? [article.faqJsonLd] : []),
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: "https://ecentic.ai/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: translate("title"),
              item: "https://ecentic.ai/blog",
            },
            {
              "@type": "ListItem",
              position: 3,
              name: article.title,
              item: `https://ecentic.ai/blog/${article.slug}`,
            },
          ],
        },
      ];

      return (
        <EditorialLayout
          eyebrow={article.seedKeyword ?? "Guide"}
          title={article.title}
          meta={
            <p>
              {translate("published")}: {formatBlogDate(article.created_at, locale)}{" "}
              · {translate("minRead", { minutes })}
            </p>
          }
          description={article.meta_description || article.excerpt}
        >
          <JsonLd schemas={structuredData} />

          <EditorialSplitSection
            left={
              <>
                <span className="mt-auto font-normal text-2xl text-primary">
                  01
                </span>
                <h2 className="text-4xl text-foreground leading-snug">
                  Article
                </h2>
              </>
            }
            right={
              <div className="flex flex-col gap-8">
                <div
                  className="blog-content"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: BabyLoveGrowth article HTML is trusted CMS content
                  dangerouslySetInnerHTML={{ __html: article.content_html }}
                />
                <TagList
                  keywords={[article.seedKeyword ?? "", ...article.keywords]}
                />
              </div>
            }
          />

          <EditorialFooter
            primary={{ href: "/sign-up", label: "Get started" }}
            secondary={{ href: "/blog", label: translate("backToBlog") }}
            note="Use these guides to improve product clarity, then turn the highest-impact fixes into your next catalog sprint."
          />
        </EditorialLayout>
      );
    }
  }

  const post = await Blog.getPublishedBySlug(slug, locale);
  if (!post) notFound();

  const path = localizePath(`/blog/${post.slug}`, locale);

  if (post.contentHtml) {
    const minutes = Math.max(1, readingTimeMinutes(post.contentHtml));
    return (
      <EditorialLayout
        eyebrow={post.category}
        title={post.title}
        meta={
          <p>
            {translate("published")}: {formatBlogDate(post.publishedAt, locale)}{" "}
            · {translate("minRead", { minutes })}
          </p>
        }
        description={post.description}
      >
        <JsonLd
          schemas={[
            {
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              headline: post.title,
              description: post.description,
              datePublished: toBlogIsoDate(post.publishedAt),
              dateModified: toBlogIsoDate(post.updatedAt),
              inLanguage: locale,
              url: `https://ecentic.ai${path}`,
              author: { "@type": "Organization", name: "ecentic" },
            },
          ]}
        />
        <EditorialSplitSection
          left={
            <>
              <span className="mt-auto font-normal text-2xl text-primary">
                01
              </span>
              <h2 className="text-4xl text-foreground leading-snug">
                Article
              </h2>
            </>
          }
          right={
            <div className="flex flex-col gap-8">
              <div
                className="blog-content"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: translated BLG HTML stored in our DB
                dangerouslySetInnerHTML={{ __html: post.contentHtml }}
              />
              <TagList keywords={[...post.tags]} />
            </div>
          }
        />
        <EditorialFooter
          primary={{ href: "/sign-up", label: "Get started" }}
          secondary={{ href: "/blog", label: translate("backToBlog") }}
          note={translate("description")}
        />
      </EditorialLayout>
    );
  }

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: toBlogIsoDate(post.publishedAt),
      dateModified: toBlogIsoDate(post.updatedAt),
      inLanguage: locale,
      author: {
        "@type": "Organization",
        name: "ecentic",
      },
      publisher: {
        "@type": "Organization",
        name: "ecentic",
        url: "https://ecentic.ai",
        logo: {
          "@type": "ImageObject",
          url: "https://ecentic.ai/icons/icon-512.png",
        },
      },
      mainEntityOfPage: `https://ecentic.ai${path}`,
      keywords: post.tags.join(", "),
      articleSection: post.category,
    },
  ];

  return (
    <EditorialLayout
      eyebrow={post.category}
      title={post.title}
      meta={
        <p>
          {translate("published")}: {formatBlogDate(post.publishedAt, locale)} ·{" "}
          {post.readTime}
        </p>
      }
      description={post.introduction}
    >
      <JsonLd schemas={structuredData} />

      <EditorialSplitSection
        left={
          <>
            <span className="mt-auto font-normal text-2xl text-primary">
              00
            </span>
            <h2 className="text-4xl text-foreground leading-snug">
              Key takeaways
            </h2>
          </>
        }
        right={
          <ul className="flex flex-col gap-3">
            {post.takeaways.map((takeaway) => (
              <li
                key={takeaway}
                className="flex gap-3 text-foreground-dimmed leading-relaxed"
              >
                <span className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{takeaway}</span>
              </li>
            ))}
          </ul>
        }
      />

      {post.sections.map((section) => (
        <EditorialSplitSection
          key={section.number}
          left={
            <>
              <span className="mt-auto font-normal text-2xl text-primary">
                {section.number}
              </span>
              <h2 className="text-4xl text-foreground leading-snug">
                {section.title}
              </h2>
            </>
          }
          right={<EditorialRichText content={section.content} />}
        />
      ))}

      <EditorialFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/blog", label: translate("backToBlog") }}
        note={translate("description")}
      />
    </EditorialLayout>
  );
};
