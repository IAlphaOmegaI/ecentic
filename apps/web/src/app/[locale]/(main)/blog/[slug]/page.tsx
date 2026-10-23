import { unwrapResult } from "@zenncore/utils";
import { readingTimeMinutes } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { localizePath } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import {
  hasFaqSection,
  isFaqSectionTitle,
  leadingTags,
  splitBlogHtmlByH2,
} from "@/lib/blog-html";
import {
  absoluteUrl,
  brandedTitle,
  createBreadcrumbSchema,
  createFaqSchema,
  createFounderSchema,
  founder,
  seo,
} from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialRichText,
  EditorialSplitSection,
} from "../_components/editorial-page";
import { FaqSection } from "../_components/faq-section";
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

/** Left-rail index continuing a section list that may or may not open at `00`. */
const nextSectionNumber = (sections: readonly { number: string }[]) =>
  String(Number(sections.at(-1)?.number ?? "00") + 1).padStart(2, "0");

/**
 * A title tag is not an H1. Where the headline we want on the page is longer
 * than the ~60 characters Google renders, the tag gets its own copy here rather
 * than a truncation — keyed by slug, so it survives BLG re-ingesting the post.
 */
const BLOG_TITLE_TAGS: Record<string, Record<string, string>> = {
  "ecentic-eu-presence-partnership-compliance-ai-visibility-bundle": {
    en: "EU Presence Bundle: Compliance + AI Shopping",
  },
  // BLG headlines lead with a promise ("Get AI Citations in 30–90 Days…")
  // and often never say the phrase the slug targets, so the title tag names
  // the search term first. Each one describes what the article actually is
  // (most are guides, not ranked lists), from its own headings.
  "best-ecommerce-ai-platforms": {
    en: "AI ecommerce platforms in 2026: how to choose",
  },
  "best-agentic-seo-tools": {
    en: "Agentic SEO for Shopify and WooCommerce stores",
  },
  "best-ecommerce-competitor-tools": {
    en: "Best ecommerce competitor analysis tools by category",
  },
  "best-llm-search-tools": {
    en: "LLM search tools for ecommerce: what to check",
  },
  "best-chatgpt-seo-tools": {
    en: "ChatGPT SEO tools for ecommerce: what they should do",
  },
  "best-gemini-seo-tools": {
    en: "Gemini SEO tools for ecommerce: how to choose",
  },
  "best-ecommerce-ai-seo": {
    en: "Ecommerce AI SEO in 2026: how AI finds products",
  },
  "best-ecommerce-content-tools": {
    en: "Best ecommerce content tools for AI search (2026)",
  },
  "best-product-listing-optimization": {
    en: "Product listing optimization for AI shopping agents",
  },
  "best-ecommerce-ai-analytics": {
    en: "Ecommerce AI analytics tools: how to evaluate them",
  },
  "best-shopify-on-page-seo-tools": {
    en: "Shopify on-page SEO tools: app, manual or platform?",
  },
  "woocommerce-ai-seo": {
    en: "WooCommerce AI SEO: technical checklist and tools",
  },
  // Kept apart from the AI-shopping-agent pillar
  // (`best-ai-shopping-agent-optimization-tools-2026`, see
  // `lib/blog-redirects.ts`): each tag names the narrower search its post
  // answers instead of repeating "AI shopping agents".
  "rank-in-chatgpt": {
    en: "How to rank your products in ChatGPT Shopping",
  },
  "future-of-ai-shopping": {
    en: "The future of AI shopping: 3 levers for retailers",
  },
  "data-sources-ai-shopping": {
    en: "AI shopping data sources: feeds, schema and reviews",
  },
};

// Keyed on the row's own locale rather than the requested one: a /es page
// falling back to the stored EN row must not advertise a title its body never
// uses, and a real ES row later just falls through to its own headline.
const blogTitleTag = (post: { slug: string; title: string; locale: string }) =>
  brandedTitle(BLOG_TITLE_TAGS[post.slug]?.[post.locale] ?? post.title);

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
  const tags = leadingTags(post.tags);

  return {
    // `absolute` so the locale layout's `"%s | ecentic"` cannot re-append a
    // suffix `brandedTitle` may have deliberately dropped.
    title: { absolute: blogTitleTag(post) },
    description: post.description,
    keywords: tags,
    // No hreflang pair: the other-locale article is a machine translation kept
    // out of the index below, and an alternate has to be indexable to count.
    alternates: {
      canonical: path,
      types: { "application/rss+xml": "/rss.xml" },
    },
    // Spanish articles are unreviewed machine translations of the English
    // ones (or the English row itself, when no translation has landed). They
    // stay readable and crawlable for Spanish visitors, but only the original
    // is offered to search.
    ...(locale === routing.defaultLocale
      ? {}
      : {
          robots: {
            index: false,
            follow: true,
            googleBot: { index: false, follow: true },
          },
        }),
    openGraph: {
      type: "article",
      url: `https://ecentic.ai${path}`,
      locale: locale === "es" ? "es_ES" : "en_US",
      title: `${post.title} | ecentic`,
      description: post.description,
      publishedTime: toBlogIsoDate(post.publishedAt),
      modifiedTime: toBlogIsoDate(post.updatedAt),
      authors: [founder.name],
      section: post.category,
      tags,
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
  const tags = leadingTags(post.tags);

  // Answers are stored in the row's own language, so a /es page falling back to
  // the English row publishes English answers — the same ones it renders.
  const faqSchema = post.faqs.length > 0 ? [createFaqSchema(post.faqs)] : [];

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
    keywords: tags.join(", "),
    articleSection: post.category,
    ...(post.thumbnailUrl
      ? {
          image: {
            "@type": "ImageObject",
            url: post.thumbnailUrl.startsWith("http")
              ? post.thumbnailUrl
              : absoluteUrl(post.thumbnailUrl),
          },
        }
      : {}),
    author: createFounderSchema(translate("author.role")),
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

  // Visible byline and date: answer engines and Google read the author from
  // the page, not only from the schema, and a generic "ecentic" byline scores
  // as anonymous. The name links to the profile the Person node points at.
  const byline = (
    <p>
      <time dateTime={toBlogIsoDate(post.publishedAt)}>
        {translate("published")}: {formatBlogDate(post.publishedAt, locale)}
      </time>{" "}
      ·{" "}
      {translate.rich("author.byline", {
        name: founder.name,
        author: (chunks) => (
          <Link
            href="/about#xhurian-shaba"
            className="underline underline-offset-4"
          >
            {chunks}
          </Link>
        ),
      })}
    </p>
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Blog", path: localizePath("/blog", locale) },
    { name: post.title, path },
  ]);

  const structuredData = [articleSchema, breadcrumbSchema, ...faqSchema];

  if (post.contentHtml) {
    const minutes = Math.max(1, readingTimeMinutes(post.contentHtml));
    // Classify against the body's own language: a /es page falling back to the
    // stored EN row still carries English headings.
    const sections = splitBlogHtmlByH2(post.contentHtml, post.locale);
    // Newer BabyLoveGrowth articles end in their own FAQ block; the stored
    // pairs are that same block, so rendering them again would print it twice.
    const showsFaq =
      post.faqs.length > 0 && !hasFaqSection(sections, post.locale);
    return (
      <EditorialLayout
        eyebrow={post.category}
        title={post.title}
        meta={
          <>
            {byline}
            <p>{translate("minRead", { minutes })}</p>
          </>
        }
        description={post.description}
      >
        <JsonLd schemas={structuredData} />
        <HtmlArticleSections sections={sections} keywords={tags} />
        {showsFaq && (
          <FaqSection
            number={nextSectionNumber(sections)}
            title={translate("faq.title")}
            faqs={post.faqs}
          />
        )}
        <EditorialFooter
          primary={{ href: "/sign-up", label: "Get started" }}
          secondary={{ href: "/blog", label: translate("action.secondary") }}
          note={translate("description")}
        />
      </EditorialLayout>
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
    <EditorialLayout
      eyebrow={post.category}
      title={post.title}
      meta={
        <>
          {byline}
          <p>{post.readTime}</p>
        </>
      }
      description={post.introduction}
    >
      <JsonLd schemas={structuredData} />

      <EditorialSplitSection
        left={
          <>
            <span className="font-normal text-2xl text-primary">00</span>
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

      {sections.map((section) => (
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

      {post.faqs.length > 0 && (
        <FaqSection
          number={nextSectionNumber(sections)}
          title={translate("faq.title")}
          faqs={post.faqs}
        />
      )}

      <EditorialFooter
        primary={{ href: "/sign-up", label: "Get started" }}
        secondary={{ href: "/blog", label: translate("action.secondary") }}
        note={translate("description")}
      />
    </EditorialLayout>
  );
};
