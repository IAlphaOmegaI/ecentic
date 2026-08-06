import { resultify } from "@zenncore/utils";
import { readingTimeMinutes } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
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

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateStaticParams = async () => {
  const [articles, posts] = await Promise.all([
    BabyLoveGrowth.listArticles(),
    Blog.listPublished(),
  ]);

  const slugs = new Set([
    ...articles.map((article) => article.slug),
    ...posts.map((post) => post.slug),
  ]);

  return [...slugs].map((slug) => ({ slug }));
};

export const generateMetadata = async ({
  params,
}: BlogPageProps): Promise<Metadata> => {
  const { slug } = await params;

  const blgResult = await resultify(() =>
    BabyLoveGrowth.getArticleBySlug(slug),
  );
  if (blgResult.success && blgResult.data) {
    const article = blgResult.data;
    const url = `https://ecentic.ai/blog/${article.slug}`;
    return {
      title: article.title,
      description: article.meta_description,
      keywords: article.keywords,
      alternates: { canonical: `/blog/${article.slug}` },
      openGraph: {
        type: "article",
        url,
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

  const result = await resultify(() => Blog.getPublishedBySlug(slug));
  if (!result.success || !result.data) return {};

  const post = result.data;
  const url = `https://ecentic.ai/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    keywords: [...post.tags],
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      type: "article",
      url,
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
            name: "Blog",
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
            Published: {formatBlogDate(article.created_at)} · {minutes} min read
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
              <h2 className="text-4xl text-foreground leading-snug">Article</h2>
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
          secondary={{ href: "/blog", label: "Back to blog" }}
          note="Use these guides to improve product clarity, then turn the highest-impact fixes into your next catalog sprint."
        />
      </EditorialLayout>
    );
  }

  const post = await Blog.getPublishedBySlug(slug);
  if (!post) notFound();

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: toBlogIsoDate(post.publishedAt),
      dateModified: toBlogIsoDate(post.updatedAt),
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
      mainEntityOfPage: `https://ecentic.ai/blog/${post.slug}`,
      keywords: post.tags.join(", "),
      articleSection: post.category,
    },
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
          name: "Blog",
          item: "https://ecentic.ai/blog",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: `https://ecentic.ai/blog/${post.slug}`,
        },
      ],
    },
  ];

  return (
    <EditorialLayout
      eyebrow={post.category}
      title={post.title}
      meta={
        <p>
          Published: {formatBlogDate(post.publishedAt)} · {post.readTime} read
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
        secondary={{ href: "/blog", label: "Back to blog" }}
        note="Use these guides to improve product clarity, then turn the highest-impact fixes into your next catalog sprint."
      />
    </EditorialLayout>
  );
};
