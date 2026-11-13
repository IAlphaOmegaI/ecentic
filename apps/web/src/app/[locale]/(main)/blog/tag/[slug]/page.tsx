import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { localizePath } from "@/i18n/locale";
import { locales } from "@/i18n/locales";
import { blogTopicSlug } from "@/lib/blog-locale";
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

  const path = localizePath(`/blog/tag/${slug}`, locale);
  const available = await Promise.all(
    locales.map(async (target) => ({
      locale: target,
      count: (await Blog.listPublishedByTag(slug, target)).length,
    })),
  );
  return {
    ...createMetadata({
      title: translate("metaTitle", { slug }),
      description: translate("metaDescription", { slug }),
      path,
    }),
    alternates: {
      canonical: path,
      languages: Object.fromEntries(
        available
          .filter((entry) => entry.count > 0)
          .map((entry) => [
            entry.locale,
            localizePath(`/blog/tag/${slug}`, entry.locale),
          ]),
      ),
    },
  };
};

export default async ({ params }: TagPageProps) => {
  const { slug } = await params;
  const locale = await getLocale();
  const translate = await getTranslations("blog");
  const collectionTranslate = await getTranslations("blogTagPage");
  const { blogTagPage } = await getMessages();

  const articles = await Blog.listPublishedByTag(slug, locale);

  if (articles.length === 0) notFound();

  const keywords = articles.flatMap((post) => [post.category, ...post.tags]);
  const topic =
    keywords.find((keyword) => blogTopicSlug(keyword) === slug) ?? slug;
  const relatedTopics = Array.from(
    new Map(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .map((keyword) => [blogTopicSlug(keyword), keyword] as const),
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
