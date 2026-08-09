"use server";

import { unique } from "@zenncore/utils";
import {
  and,
  countDistinct,
  count as countRows,
  eq,
  inArray,
  max,
  min,
  sql,
} from "drizzle-orm";
import { db, schema } from "../database";
import { withAuthentication } from "../utils/authentication";
import { withInstrumentation } from "../utils/context";
import { dedupe } from "../utils/dedupe";
import { Environment } from "../utils/environment";
import {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/error";
import type { Document } from "../utils/repository";
import { repository, resultifyRead } from "../utils/repository";
import * as Detection from "./intelligence/detect";
import * as Scan from "./scan";
import * as Simulation from "./simulation";

export const { get, paginate, create, update, destroy, exists, count, find } =
  repository(schema.competitor);

export type Type = Document<typeof schema.competitor>;

/**
 * Competitor scoping helper. Every read below takes an optional store: pass it
 * for per-store surfaces (the dashboard, a scan roster), omit it only for
 * genuinely account-wide ones.
 */
const scope = (userId: string, store?: string) =>
  store
    ? and(
        eq(schema.competitor.userId, userId),
        eq(schema.competitor.storeId, store),
      )
    : eq(schema.competitor.userId, userId);

export const skimForCurrentUser = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    return find(Environment.SERVER, {
      where: scope(context.session.user.id, store),
      limit: 10,
    });
  },
  "Competitor.skimForCurrentUser",
);

/**
 * Whole competitor rows for one store, uncapped — for roster surfaces that act
 * on the records themselves (toggle selection, remove). `listForCurrentUser`
 * trims to display fields and `skimForCurrentUser` caps at a 10-row preview,
 * so neither can back a roster the user edits.
 */
export const listForStore = withAuthentication(
  async (context, { store }: { store: string }) => {
    return find(Environment.SERVER, {
      where: scope(context.session.user.id, store),
      orderBy: [{ column: schema.competitor.title, direction: "asc" }],
    });
  },
  "Competitor.listForStore",
);

export type Candidate = {
  id: string;
  title: string;
  brand: string | null;
  price: string | null;
  image: string | null;
  selected: boolean;
};

/**
 * Full (uncapped) competitor list trimmed to display fields, for selection
 * surfaces like the scan setup roster. Pass the store the roster belongs to —
 * without it the picker offers rivals from every store on the account.
 */
export const listForCurrentUser = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    const result = await find(Environment.SERVER, {
      where: scope(context.session.user.id, store),
      orderBy: [{ column: schema.competitor.title, direction: "asc" }],
    });
    if (!result.success) return result;

    return {
      success: true as const,
      data: result.data.map(
        (competitor): Candidate => ({
          id: competitor.id,
          title: competitor.title,
          brand: competitor.brand,
          price: competitor.price,
          image: competitor.image,
          selected: competitor.selected,
        }),
      ),
    };
  },
  "Competitor.listForCurrentUser",
);

/**
 * Total and selected competitor counts, scoped to a store when one is given.
 * Use this for count surfaces (e.g. the simulation estimate) instead of
 * measuring `skimForCurrentUser()`, which caps at a 10-row preview.
 */
export const countForCurrentUser = withAuthentication(
  async (context, { store }: { store?: string } = {}) => {
    const user = context.session.user.id;

    const [total, selected] = await Promise.all([
      count(Environment.SERVER, scope(user, store)),
      count(
        Environment.SERVER,
        and(scope(user, store), eq(schema.competitor.selected, true)),
      ),
    ]);
    if (!total.success) return total;
    if (!selected.success) return selected;

    return {
      success: true as const,
      data: { total: total.data, selected: selected.data },
    };
  },
  "Competitor.countForCurrentUser",
);

export const removeForUser = withAuthentication(
  async (context, { id }: { id: string }) => {
    const record = await get(Environment.SERVER, id);
    if (!record.success) return record;
    if (!record.data)
      return {
        success: false,
        error: new NotFoundError("Competitor not found"),
      };

    if (record.data.userId !== context.session.user.id)
      return { success: false, error: new UnauthorizedError("Not authorized") };

    return destroy(Environment.SERVER, id);
  },
  "Competitor.removeForUser",
);

export const toggleSelection = withAuthentication(
  async (context, { id, selected }: { id: string; selected: boolean }) => {
    const record = await get(Environment.SERVER, id);
    if (!record.success) return record;
    if (!record.data)
      return {
        success: false,
        error: new NotFoundError("Competitor not found"),
      };
    if (record.data.userId !== context.session.user.id)
      return { success: false, error: new UnauthorizedError("Not authorized") };

    return update(Environment.SERVER, id, { selected });
  },
  "Competitor.toggleSelection",
);

// Stream competitor detection back to the client. Runs in one request — the
// model names real competitors and each is persisted and pushed the moment it
// lands, so the UI fills in live. Returns a streamable the client reads with
// readStreamableValue; see Detection.stream for the engine and event shape.
export const streamDetection = withAuthentication(
  async (
    context,
    { products, store }: { products: string[]; store: string },
  ) => {
    if (products.length === 0)
      return {
        success: false as const,
        error: new ValidationError("No products selected"),
      };

    return {
      success: true as const,
      data: Detection.stream({
        user: context.session.user.id,
        products,
        store,
      }),
    };
  },
  "Competitor.streamDetection",
);

const aggregateBrands = (
  competitors: Type[],
  simulations: Simulation.Summary[],
) => {
  return unique(competitors.map((c) => c.brand ?? c.title)).flatMap((brand) => {
    const group = competitors.filter((c) => (c.brand ?? c.title) === brand);

    const first = group[0];
    if (!first) return [];

    const ids = unique(group.map((competitor) => competitor.id));

    const brandSimulations = simulations.filter((simulation) =>
      ids.includes(simulation.competitorId),
    );

    const wins = brandSimulations.filter(
      (simulation) => simulation.winner === "product",
    ).length;

    const total = brandSimulations.length;

    const latestUpdate = group.reduce(
      (latest, competitor) =>
        competitor.updatedAt > latest ? competitor.updatedAt : latest,
      first.updatedAt,
    );

    return {
      _id: first.id,
      brand,
      products: group.length,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      simulations: total,
      updatedAt: latestUpdate,
    };
  });
};

export const gatherIntelligence = dedupe(
  withAuthentication(async (context, { store }: { store?: string } = {}) => {
    if (store) {
      // Three independent reads, so they go out together. The brand rollups are
      // grouped by Postgres — this used to load every competitor and every
      // simulation for the store and fold them in JavaScript, which is now the
      // paginated path's job too.
      const userId = context.session.user.id;
      const [scan, aggregated, competitors] = await Promise.all([
        Scan.getLatest(Environment.SERVER, { store }),
        aggregateBrandsForStore(Environment.SERVER, {
          user: userId,
          store,
        }),
        count(Environment.SERVER, scope(userId, store)),
      ]);
      if (!scan.success) return scan;
      if (!aggregated.success) return aggregated;
      if (!competitors.success) return competitors;

      return {
        success: true,
        data: {
          brands: aggregated.data.brands,
          competitors: competitors.data,
          scan: scan.data[0],
        },
      };
    }

    const [scan, competitors] = await Promise.all([
      Scan.getLatest(Environment.SERVER, { store }),
      skimForCurrentUser(Environment.SERVER),
    ]);
    if (!scan.success) return scan;
    if (!competitors.success) return competitors;

    if (competitors.data.length === 0)
      return {
        success: true,
        data: {
          brands: [],
          competitors: 0,
          scan: scan.data[0],
        },
      };

    const simulations = await Simulation.getForCompetitors(Environment.SERVER, {
      competitors: competitors.data.map((competitor) => competitor.id),
    });

    if (!simulations.success) return simulations;

    const brands = aggregateBrands(competitors.data, simulations.data);

    return {
      success: true,
      data: {
        brands,
        competitors: competitors.data.length,
        scan: scan.data[0],
      },
    };
  }, "Competitor.gatherIntelligence"),
);

// The brand a competitor rolls up under — its own brand, falling back to the
// product title. Shared by the aggregate and its total so the two always group
// on identical keys.
const brandKey = sql<string>`coalesce(${schema.competitor.brand}, ${schema.competitor.title})`;

/**
 * One page of brand rollups, grouped and counted by Postgres.
 *
 * The previous implementation loaded every competitor and every simulation for
 * the store, grouped them in JavaScript and sliced the array. Beyond the volume,
 * the underlying read had no `ORDER BY`, so the slice boundaries were undefined
 * and a brand could repeat on one page and vanish from the next. Grouping in SQL
 * with an explicit order makes pagination well-defined as well as cheap.
 */
export const aggregateBrandsForStore = withInstrumentation(
  async (
    _,
    {
      user,
      store,
      pagination,
    }: {
      user: string;
      store: string;
      pagination?: { page: number; size: number };
    },
  ) => {
    // Simulations are scoped to this store's products, matching what
    // `Simulation.getForStore` fed the in-memory aggregation: a competitor judged
    // against another store's catalog must not count here.
    const storeProducts = db
      .select({ id: schema.product.id })
      .from(schema.product)
      .where(
        and(eq(schema.product.userId, user), eq(schema.product.storeId, store)),
      );

    const competitorScope = and(
      eq(schema.competitor.userId, user),
      eq(schema.competitor.storeId, store),
    );

    const result = await resultifyRead(async () =>
      Promise.all([
        db
          .select({
            _id: min(schema.competitor.id),
            brand: brandKey,
            products: countDistinct(schema.competitor.id),
            simulations: countRows(schema.simulation.id),
            wins: sql<number>`count(${schema.simulation.id}) filter (where ${schema.simulation.winner} = 'product')`,
            updatedAt: max(schema.competitor.updatedAt),
          })
          .from(schema.competitor)
          .leftJoin(
            schema.simulation,
            and(
              eq(schema.simulation.competitorId, schema.competitor.id),
              inArray(schema.simulation.productId, storeProducts),
            ),
          )
          .where(competitorScope)
          .groupBy(brandKey)
          .orderBy(brandKey)
          .$dynamic()
          .limit(pagination ? pagination.size : Number.MAX_SAFE_INTEGER)
          .offset(pagination ? (pagination.page - 1) * pagination.size : 0),
        db
          .select({ value: countDistinct(brandKey) })
          .from(schema.competitor)
          .where(competitorScope),
      ]),
    );

    if (!result.success)
      return {
        success: false as const,
        error: new DatabaseError("Failed to aggregate competitor brands", {
          cause: result.error,
        }),
      };

    const [rows, totals] = result.data;

    return {
      success: true as const,
      data: {
        brands: rows.map((row) => ({
          _id: row._id ?? row.brand,
          brand: row.brand,
          products: row.products,
          winRate:
            row.simulations > 0
              ? Math.round((Number(row.wins) / row.simulations) * 100)
              : 0,
          simulations: row.simulations,
          updatedAt: row.updatedAt ?? new Date(0),
        })),
        total: totals[0]?.value ?? 0,
      },
    };
  },
  "Competitor.aggregateBrandsForStore",
);

export const gatherPaginatedIntelligence = withAuthentication(
  async (
    context,
    { page, size, store }: { page: number; size: number; store?: string },
  ) => {
    if (store) {
      const [scan, paginated] = await Promise.all([
        Scan.getLatest(Environment.SERVER, { store }),
        aggregateBrandsForStore(Environment.SERVER, {
          user: context.session.user.id,
          store,
          pagination: { page, size },
        }),
      ]);
      if (!scan.success) return scan;
      if (!paginated.success) return paginated;

      return {
        success: true,
        data: {
          brands: paginated.data.brands,
          scan: scan.data[0],
          pagination: { total: paginated.data.total, page, size },
        },
      };
    }

    const scan = await Scan.getLatest(Environment.SERVER, { store });
    if (!scan.success) return scan;

    const competitors = await paginate(Environment.SERVER, page, size, {
      where: eq(schema.competitor.userId, context.session.user.id),
    });
    if (!competitors.success) return competitors;

    const simulations = await Simulation.getForCompetitors(Environment.SERVER, {
      competitors: competitors.data.items.map((competitor) => competitor.id),
    });

    if (!simulations.success) return simulations;

    const allBrands = aggregateBrands(competitors.data.items, simulations.data);
    const total = allBrands.length;
    const offset = (page - 1) * size;
    const brands = allBrands.slice(offset, offset + size);

    return {
      success: true,
      data: {
        brands,
        scan: scan.data[0],
        pagination: { total, page, size },
      },
    };
  },
  "Competitor.gatherPaginatedIntelligence",
);
