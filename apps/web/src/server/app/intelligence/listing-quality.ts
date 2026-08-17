/**
 * Wires the pure listing-rule registry (`listing-rules.ts`) to a store's
 * synced catalog: builds the canonical listing per product, evaluates every
 * rule, and aggregates readiness per surface (universal + each platform) for
 * the Data Quality page.
 */

import { and, eq } from "drizzle-orm";
import { schema } from "../../database";
import { dedupe } from "../../utils/dedupe";
import { withSubscription } from "../../utils/entitlement";
import { Environment } from "../../utils/environment";
import { extractCatalogFacts } from "../feed-export";
import * as Product from "../product";
import * as Store from "../store";
import {
  type Attribute,
  catalogContextFor,
  evaluateListing,
  type Finding,
  type Listing,
  type ListingStatus,
  RULES,
  type RuleId,
  SEVERITY_RANK,
  SURFACES,
  type Surface,
  statusFor,
} from "./listing-rules";

export type {
  Attribute,
  CatalogContext,
  Finding,
  Listing,
  ListingStatus,
  Platform,
  Rule,
  RuleId,
  Severity,
  Surface,
  Verdict,
} from "./listing-rules";
export {
  catalogContextFor,
  evaluateListing,
  isValidGtin,
  PLATFORMS,
  RULE_IDS,
  RULES,
  SURFACES,
} from "./listing-rules";

export type ListingReport = {
  id: string;
  title: string;
  image: string | null;
  link: string | null;
  findings: Finding[];
  status: Record<Surface, ListingStatus>;
};

export type SurfaceSummary = {
  blockers: number;
  warnings: number;
  ready: number;
  readyShare: number;
};

export type TopIssue = {
  rule: RuleId;
  attribute: Attribute;
  count: number;
  universal: Finding["universal"];
  platforms: Finding["platforms"];
};

export type QualityReport = {
  products: ListingReport[];
  total: number;
  surfaces: Record<Surface, SurfaceSummary>;
  topIssues: TopIssue[];
};

const TOP_ISSUES_MAX = 8;

/** Parses the JSON-encoded `images` column defensively, like the feed does. */
const parseImages = (images: string | null) => {
  try {
    const parsed = JSON.parse(images ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
};

/**
 * Digs the raw (unvalidated) barcode out of the platform payload. Spaces and
 * dashes are stripped before validation, per GS1 formatting.
 */
const extractBarcode = (rawData: string | null) => {
  try {
    const parsed = JSON.parse(rawData ?? "null") as {
      variants?: { barcode?: unknown }[];
    } | null;
    const barcode = parsed?.variants?.[0]?.barcode;
    if (typeof barcode !== "string") return null;
    const normalized = barcode.replace(/[\s-]/g, "");
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
};

const parseAmount = (value: string | null) => {
  if (value === null) return null;
  const amount = Number.parseFloat(value);
  return Number.isNaN(amount) ? null : amount;
};

/**
 * Runs the full rule registry over a store's active catalog and aggregates
 * readiness per surface. Products are returned worst-first.
 */
export const auditListings = dedupe(
  withSubscription(async (context, { store: storeId }: { store: string }) => {
    const store = await Store.get(Environment.SERVER, storeId);
    if (!store.success) return store;
    if (!store.data)
      return { success: false as const, error: new Error("Store not found") };
    if (store.data.userId !== context.session.user.id)
      return { success: false as const, error: new Error("Not authorized") };

    const products = await Product.find(Environment.SERVER, {
      where: and(
        eq(schema.product.storeId, storeId),
        eq(schema.product.status, "active"),
      ),
    });
    if (!products.success) return products;

    const listings = products.data.map(
      (
        product,
      ): { product: (typeof products.data)[number]; listing: Listing } => {
        const facts = extractCatalogFacts(product.rawData);
        return {
          product,
          listing: {
            feedId: product.externalId ?? product.id,
            title: product.title,
            description: product.description,
            link: product.url,
            images: parseImages(product.images),
            price: parseAmount(product.price),
            compareAtPrice: parseAmount(product.compareAtPrice),
            currency: product.currency,
            brand: facts.brand,
            barcode: extractBarcode(product.rawData) ?? facts.gtin,
            mpn: facts.mpn,
          },
        };
      },
    );

    const catalog = catalogContextFor(listings.map((entry) => entry.listing));

    const reports = listings.map(({ product, listing }): ListingReport => {
      const findings = evaluateListing(listing, catalog);

      return {
        id: product.id,
        title: product.title,
        image: listing.images[0] ?? null,
        link: product.url,
        findings,
        status: Object.fromEntries(
          SURFACES.map((surface) => [surface, statusFor(findings, surface)]),
        ) as Record<Surface, ListingStatus>,
      };
    });

    const weight = (report: ListingReport) =>
      report.findings
        .flatMap((finding) => finding.platforms)
        .reduce(
          (total, entry) => total + SEVERITY_RANK[entry.verdict.severity] ** 4,
          0,
        );

    const ordered = [...reports].sort((a, b) => weight(b) - weight(a));

    const surfaces = Object.fromEntries(
      SURFACES.map((surface) => {
        const blockers = reports.filter(
          (report) => report.status[surface] === "blocker",
        ).length;
        const warnings = reports.filter(
          (report) => report.status[surface] === "warning",
        ).length;
        const ready = reports.filter((report) =>
          ["ready", "info"].includes(report.status[surface]),
        ).length;
        return [
          surface,
          {
            blockers,
            warnings,
            ready,
            readyShare:
              reports.length > 0
                ? Math.round((ready / reports.length) * 100)
                : 0,
          } satisfies SurfaceSummary,
        ];
      }),
    ) as Record<Surface, SurfaceSummary>;

    const topIssues = RULES.flatMap((rule): TopIssue[] => {
      const count = reports.filter((report) =>
        report.findings.some((finding) => finding.rule === rule.id),
      ).length;
      if (count === 0) return [];
      const finding = reports
        .flatMap((report) => report.findings)
        .find((entry) => entry.rule === rule.id);
      return [
        {
          rule: rule.id,
          attribute: rule.attribute,
          count,
          universal: finding?.universal ?? rule.universal,
          platforms: finding?.platforms ?? [],
        },
      ];
    })
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_ISSUES_MAX);

    return {
      success: true as const,
      data: {
        products: ordered,
        total: reports.length,
        surfaces,
        topIssues,
      } satisfies QualityReport,
    };
  }, "ListingQuality.auditListings"),
);
