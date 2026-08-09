import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";
import * as BabyLoveGrowth from "@/server/app/babylovegrowth";
import * as Blog from "@/server/app/blog";

export const alt = "ecentic blog post";
export const size = ogImageSize;
export const contentType = ogImageContentType;

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async ({ params }: Props) => {
  const { slug, locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;

  if (locale === "en") {
    const post = await Blog.getPublishedBySlug(slug, "en");
    if (post) {
      return createOgImage({
        title: post.title,
        description: post.description,
      });
    }

    const article = await BabyLoveGrowth.getArticleBySlug(slug);
    if (article) {
      return createOgImage({
        title: article.title,
        description: article.meta_description || article.excerpt,
      });
    }
  }

  const post = await Blog.getPublishedBySlug(slug, locale);

  return createOgImage({
    title: post?.title ?? "ecentic blog",
    description: post?.description ?? "Agent commerce insights",
  });
};
