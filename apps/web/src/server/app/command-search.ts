"use server";

import { resultify } from "@zenncore/utils";
import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { isVerifiedCompetitor } from "@/lib/competitor-source";
import { schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { Environment } from "../utils/environment";
import { NotFoundError, ValidationError } from "../utils/error";
import * as Competitor from "./competitor";
import * as Product from "./product";
import * as Store from "./store";

const input = z.object({
  store: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .refine((value) => !/\p{Cc}/u.test(value)),
  query: z
    .string()
    .trim()
    .max(120)
    .refine((value) => !/\p{Cc}/u.test(value)),
});

export type Match = {
  id: string;
  title: string;
  price: string | null;
  currency: string | null;
  image: string | null;
};

export type Results = {
  products: Match[];
  competitors: (Match & { confidence: Competitor.Type["confidence"] })[];
};

const image = async (images: string | null) => {
  const parsed = await resultify(() => JSON.parse(images ?? "[]"));
  return parsed.success &&
    Array.isArray(parsed.data) &&
    typeof parsed.data[0] === "string"
    ? parsed.data[0]
    : null;
};

/**
 * Search the complete owned store before limiting command-menu display rows.
 * Product title/SKU and competitor title/brand share one authenticated request.
 * Never use the ten-row preview delegates or expose inferred competitor prices.
 */
export const searchForCurrentUser = withAuthentication(
  async (context, request: { store: string; query: string }) => {
    const parsed = input.safeParse(request);
    if (!parsed.success)
      return {
        success: false as const,
        error: new ValidationError("Invalid command search"),
      };

    const empty: Results = { products: [], competitors: [] };
    if (!parsed.data.query) return { success: true as const, data: empty };

    const store = await Store.find(Environment.SERVER, {
      where: and(
        eq(schema.store.id, parsed.data.store),
        eq(schema.store.userId, context.session.user.id),
      ),
      limit: 1,
    });
    if (!store.success) return store;
    if (!store.data[0])
      return { success: false as const, error: new NotFoundError("Store") };

    // Parameter binding guards SQL injection; escaping also makes LIKE syntax literal.
    const pattern = `%${parsed.data.query.replaceAll(/[\\%_]/g, (value) => `\\${value}`)}%`;
    const [products, competitors] = await Promise.all([
      Product.find(Environment.SERVER, {
        where: and(
          eq(schema.product.userId, context.session.user.id),
          eq(schema.product.storeId, parsed.data.store),
          or(
            ilike(schema.product.title, pattern),
            ilike(schema.product.sku, pattern),
          ),
        ),
        orderBy: [
          { column: schema.product.title, direction: "asc" },
          { column: schema.product.id, direction: "asc" },
        ],
        limit: 5,
      }),
      Competitor.find(Environment.SERVER, {
        where: and(
          eq(schema.competitor.userId, context.session.user.id),
          eq(schema.competitor.storeId, parsed.data.store),
          or(
            ilike(schema.competitor.title, pattern),
            ilike(schema.competitor.brand, pattern),
          ),
        ),
        orderBy: [
          { column: schema.competitor.title, direction: "asc" },
          { column: schema.competitor.id, direction: "asc" },
        ],
        limit: 4,
      }),
    ]);
    if (!products.success) return products;
    if (!competitors.success) return competitors;

    const data: Results = {
      products: await Promise.all(
        products.data.map(async (product) => ({
          id: product.id,
          title: product.title,
          price: product.price,
          currency: product.currency,
          image: await image(product.images),
        })),
      ),
      competitors: competitors.data.map((competitor) => ({
        id: competitor.id,
        title: competitor.title,
        price: isVerifiedCompetitor(competitor.confidence)
          ? competitor.price
          : null,
        currency: competitor.currency,
        image: competitor.image,
        confidence: competitor.confidence,
      })),
    };
    return { success: true as const, data };
  },
  "CommandSearch.searchForCurrentUser",
);
