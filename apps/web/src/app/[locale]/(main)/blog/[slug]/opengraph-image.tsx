import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";
import * as Blog from "@/server/app/blog";

export const alt = "ecentic";
export const size = ogImageSize;
export const contentType = ogImageContentType;

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async ({ params }: Props) => {
  const { slug, locale: raw } = await params;
  if (!hasLocale(routing.locales, raw)) notFound();
  const locale = raw;

  const post = await Blog.getPublishedBySlug(slug, locale);
  if (!post) notFound();

  return createOgImage({
    locale,
    title: post.title,
    description: post.description,
  });
};
