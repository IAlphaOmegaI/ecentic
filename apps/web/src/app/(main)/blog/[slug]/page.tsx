import { unwrapResult } from "@zenncore/utils";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";
import {
  EditorialFooter,
  EditorialLayout,
  EditorialRichText,
  EditorialSplitSection,
} from "../_components/editorial-page";

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

type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: BlogPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const result = await Blog.getPublishedBySlug(Environment.SERVER, { slug });

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
      title: `${post.title} | écentic`,
      description: post.description,
      publishedTime: toBlogIsoDate(post.publishedAt),
      modifiedTime: toBlogIsoDate(post.updatedAt),
      authors: ["écentic"],
      section: post.category,
      tags: [...post.tags],
      images: [
        {
          url: "/images/opengraph.png",
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | écentic`,
      description: post.description,
      images: ["/images/opengraph.png"],
    },
  };
};

export default async ({ params }: BlogPageProps) => {
  const { slug } = await params;
  const post = await unwrapResult(
    Blog.getPublishedBySlug(Environment.SERVER, { slug }),
  );

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
        name: "écentic",
      },
      publisher: {
        "@type": "Organization",
        name: "écentic",
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
