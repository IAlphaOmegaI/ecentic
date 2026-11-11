import { slugify } from "babylovegrowth-next-js-blog";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { localizePath } from "@/i18n/locale";
import { createMetadata } from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import {
  EditorialFooter,
  EditorialLayout,
} from "../../_components/editorial-page";
import { TagCollection } from "./_components/tag-collection";

type TagPageProps = {
  params: Promise<{ slug: string }>;
};

export const generateMetadata = async ({
  params,
}: TagPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const locale = await getLocale();
  const translate = await getTranslations({ locale, namespace: "blog.tag" });

  return createMetadata({
    title: translate("metaTitle", { slug }),
    description: translate("metaDescription", { slug }),
    path: localizePath(`/blog/tag/${slug}`, locale),
  });
};

export default async ({ params }: TagPageProps) => {
  const { slug } = await params;
  const locale = await getLocale();
  const translate = await getTranslations("blog");
  const collectionTranslate = await getTranslations("blogTagPage");
  const { blogTagPage } = await getMessages();

  // Slugs are shared across locales, so the Spanish row is the same article in
  // Spanish. Fall back to English whenever a translation has not landed yet —
  // an English card beats an empty tag page.
  const [englishPosts, spanishPosts] = await Promise.all([
    Blog.listPublishedByTag(slug, "en"),
    locale === "es" ? Blog.listPublishedByTag(slug, "es") : Promise.resolve([]),
  ]);

  const spanishBySlug = new Map(
    spanishPosts.map((post) => [post.slug, post] as const),
  );

  const articles = englishPosts.map(
    (post) => (locale === "es" && spanishBySlug.get(post.slug)) || post,
  );

  if (articles.length === 0) notFound();

  const keywords = englishPosts.flatMap((post) => [
    post.category,
    ...post.tags,
  ]);
  const topic = keywords.find((keyword) => slugify(keyword) === slug) ?? slug;
  const relatedTopics = Array.from(
    new Map(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .map((keyword) => [slugify(keyword), keyword] as const),
    ),
  )
    .filter(([topicSlug]) => topicSlug && topicSlug !== slug)
    .slice(0, 6)
    .map(([topicSlug, label]) => ({ slug: topicSlug, label }));

  return (
    <EditorialLayout
      compact
      eyebrow={blogTagPage.collection}
      title={topic}
      meta={
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <span>{blogTagPage.collection}</span>
          <span>{translate("tag.count", { count: articles.length })}</span>
        </div>
      }
      description={collectionTranslate("description", { topic })}
    >
      <TagCollection
        articles={articles}
        relatedTopics={relatedTopics}
        locale={locale}
        copy={blogTagPage}
        readLabel={translate("tag.action.primary")}
      />

      <EditorialFooter
        primary={{ href: "/sign-up", label: translate("action.tertiary") }}
        secondary={{ href: "/blog", label: translate("action.allArticles") }}
        note={translate("tag.note")}
      />
    </EditorialLayout>
  );
};
