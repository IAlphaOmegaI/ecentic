/**
 * Wires the pure listing-rule registry (`listing-rules.ts`) to a store's
 * synced catalog: builds the canonical listing per product, evaluates every
 * rule, and aggregates per-platform readiness for the Data Quality page.
 */

import { and, eq } from "drizzle-orm";
import { schema } from "../../database";
import { withAuthentication } from "../../utils/authentication";
import { dedupe } from "../../utils/dedupe";
import { Environment } from "../../utils/environment";
import { extractCatalogFacts } from "../feed-export";
import * as Product from "../product";
import * as Store from "../store";
import {
  type Attribute,
  evaluateListing,
  type Finding,
  type ListingStatus,
  PLATFORMS,
  type Platform,
  RULES,
  type RuleId,
  SEVERITY_RANK,
  statusFor,
  type Verdict,
} from "./listing-rules";

export type {
  Attribute,
  Finding,
  Listing,
  ListingStatus,
  Platform,
  Rule,
  RuleId,
  Severity,
  Verdict,
} from "./listing-rules";
export {
  evaluateListing,
  isValidGtin,
  PLATFORMS,
  RULE_IDS,
  RULES,
} from "./listing-rules";

export type ListingReport = {
  id: string;
  title: string;
  image: string | null;
  link: string | null;
  findings: Finding[];
  status: Record<Platform, ListingStatus>;
};

export type PlatformSummary = {
  blockers: number;
  warnings: number;
  ready: number;
  readyShare: number;
};

export type TopIssue = {
  rule: RuleId;
  attribute: Attribute;
  count: number;
  platforms: { platform: Platform; verdict: Verdict }[];
};

export type QualityReport = {
  products: ListingReport[];
  total: number;
  platforms: Record<Platform, PlatformSummary>;
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

/** Digs the raw (unvalidated) barcode out of the platform payload. */
const extractBarcode = (rawData: string | null) => {
  try {
    const parsed = JSON.parse(rawData ?? "null") as {
      variants?: { barcode?: unknown }[];
    } | null;
    const barcode = parsed?.variants?.[0]?.barcode;
    return typeof barcode === "string" && barcode.trim().length > 0
      ? barcode.trim()
      : null;
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
 * per-platform readiness. Products are returned worst-first.
 */
export const auditListings = dedupe(
  withAuthentication(async (context, { store: storeId }: { store: string }) => {
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

    const reports = products.data.map((product): ListingReport => {
      const facts = extractCatalogFacts(product.rawData);
      const images = parseImages(product.images);

      const findings = evaluateListing({
        feedId: product.externalId ?? product.id,
        title: product.title,
        description: product.description,
        link: product.url,
        images,
        price: parseAmount(product.price),
        compareAtPrice: parseAmount(product.compareAtPrice),
        currency: product.currency,
        brand: facts.brand,
        barcode: extractBarcode(product.rawData) ?? facts.gtin,
        mpn: facts.mpn,
      });

      return {
        id: product.id,
        title: product.title,
        image: images[0] ?? null,
        link: product.url,
        findings,
        status: Object.fromEntries(
          PLATFORMS.map((platform) => [
            platform,
            statusFor(findings, platform),
          ]),
        ) as Record<Platform, ListingStatus>,
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

    const platforms = Object.fromEntries(
      PLATFORMS.map((platform) => {
        const blockers = reports.filter(
          (report) => report.status[platform] === "blocker",
        ).length;
        const warnings = reports.filter(
          (report) => report.status[platform] === "warning",
        ).length;
        const ready = reports.filter((report) =>
          ["ready", "info"].includes(report.status[platform]),
        ).length;
        return [
          platform,
          {
            blockers,
            warnings,
            ready,
            readyShare:
              reports.length > 0
                ? Math.round((ready / reports.length) * 100)
                : 0,
          } satisfies PlatformSummary,
        ];
      }),
    ) as Record<Platform, PlatformSummary>;

    const topIssues = RULES.flatMap((rule): TopIssue[] => {
      const count = reports.filter((report) =>
        report.findings.some((finding) => finding.rule === rule.id),
      ).length;
      if (count === 0) return [];
      return [
        {
          rule: rule.id,
          attribute: rule.attribute,
          count,
          platforms: PLATFORMS.flatMap((platform) => {
            const verdict = rule.platforms[platform];
            return verdict ? [{ platform, verdict }] : [];
          }),
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
        platforms,
        topIssues,
      } satisfies QualityReport,
    };
  }, "ListingQuality.auditListings"),
);
