"use server";

import { and, eq } from "drizzle-orm";
import { schema } from "../database";
import { withContext } from "../utils/context";
import { dedupe } from "../utils/dedupe";
import { Environment } from "../utils/environment";
import { type Document, repository } from "../utils/repository";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.blogPost);

export type Type = Document<typeof schema.blogPost>;

const published = eq(schema.blogPost.status, "published");

export const listPublished = dedupe(
  withContext(async () => {
    return find(Environment.SERVER, {
      where: published,
      orderBy: [
        { column: schema.blogPost.publishedAt, direction: "desc" },
        { column: schema.blogPost.updatedAt, direction: "desc" },
      ],
    });
  }, "Blog.listPublished"),
);

export const getPublishedBySlug = dedupe(
  withContext(async (_, { slug }: { slug: string }) => {
    const posts = await find(Environment.SERVER, {
      where: and(published, eq(schema.blogPost.slug, slug)),
      limit: 1,
    });

    if (!posts.success) return posts;
    return { success: true, data: posts.data[0] ?? null };
  }, "Blog.getPublishedBySlug"),
);
