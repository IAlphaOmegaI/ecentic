import { createOgImage, ogImageContentType, ogImageSize } from "@/lib/og";
import * as Blog from "@/server/app/blog-cache";

export const alt = "ecentic blog post";
export const size = ogImageSize;
export const contentType = ogImageContentType;

type Props = { params: Promise<{ slug: string }> };

export default async ({ params }: Props) => {
  const { slug } = await params;
  const post = await Blog.getPublishedBySlug(slug);

  return createOgImage({
    title: post?.title ?? "ecentic blog",
    description: post?.description ?? "Agent commerce insights",
  });
};
