import { unwrapResult } from "@zenncore/utils";
import { readingTimeMinutes } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { splitBlogHtmlByH2 } from "@/lib/blog-html";
import * as Blog from "@/server/app/blog";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialRichText,
  EditorialSplitSection,
} from "../_components/editorial-page";
import { HtmlArticleSections } from "../_components/html-article-sections";
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
  params: Promise<{ slug: string }>;
};

export const generateStaticParams = async () => {
  const slugs = await Blog.listCatalogSlugs();
  // Prerender every post in every locale. Bodies come from stored
  // `blog_post` rows (BLG webhook upserts EN + ES); missing locale falls
  // back in `Blog.resolve` and regenerates after `revalidateTag("blog")`.
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
};

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
  const { slug } = await params;
  const locale = await getLocale();

  const translate = await getTranslations("blog");
  // Static / ISR — locale rows are written by the BLG webhook (or editorial);
  // `revalidateTag("blog")` regenerates these pages. No live BLG here.
  const resolved = await unwrapResult(Blog.resolve({ slug, locale }));
  if (!resolved) notFound();

  const post = resolved.post;
  const path = localizePath(`/blog/${post.slug}`, locale);

  if (post.contentHtml) {
    const minutes = Math.max(1, readingTimeMinutes(post.contentHtml));
    // Classify against the body's own language: a /es page falling back to the
    // stored EN row still carries English headings.
    const sections = splitBlogHtmlByH2(post.contentHtml, post.locale);
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
        <HtmlArticleSections sections={sections} keywords={[...post.tags]} />
        <EditorialFooter
          primary={{ href: "/sign-up", label: "Get started" }}
          secondary={{ href: "/blog", label: translate("action.secondary") }}
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
            <span className="font-normal text-2xl text-primary">
              00
            </span>
            <h2 className="text-4xl text-foreground leading-snug">
              Key takeaways
            </h2>
          </>
        }
        right={
          <div className="flex flex-col gap-5">
            <h2 className="font-semibold text-2xl text-foreground leading-snug md:text-3xl">
              Key takeaways
            </h2>
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
          </div>
        }
      />

      {post.sections.map((section) => (
        <EditorialSplitSection
          key={section.number}
          left={
            <>
              <span className="font-normal text-2xl text-primary">
                {section.number}
              </span>
              <h2 className="text-4xl text-foreground leading-snug">
                {section.title}
              </h2>
            </>
          }
          right={
            <div className="flex flex-col gap-5">
              <h2 className="font-semibold text-2xl text-foreground leading-snug md:text-3xl">
                {section.title}
              </h2>
              <EditorialRichText content={section.content} />
            </div>
          }
        />
      ))}

      <EditorialFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/blog", label: translate("action.secondary") }}
        note={translate("description")}
      />
    </EditorialLayout>
  );
};
