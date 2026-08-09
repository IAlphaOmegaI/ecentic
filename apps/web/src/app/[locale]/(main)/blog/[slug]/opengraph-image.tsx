import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";
import * as Blog from "@/server/app/blog";

export const alt = "ecentic blog post";
export const size = ogImageSize;
export const contentType = ogImageContentType;

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async ({ params }: Props) => {
  const { slug, locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;

  const post =
    (await Blog.getPublishedBySlug(slug, locale)) ??
    (locale === "es" ? await Blog.getPublishedBySlug(slug, "en") : null);

  return createOgImage({
    title: post?.title ?? "ecentic blog",
    description: post?.description ?? "Agent commerce insights",
  });
};
