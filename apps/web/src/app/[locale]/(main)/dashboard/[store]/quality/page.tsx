import {
  BullseyeIcon,
  GaugeIcon,
  RadarIcon,
  ShoppingCartIcon,
} from "@zenncore/icons";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Suspense } from "react";
import * as ListingQuality from "@/server/app/intelligence/listing-quality";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { StatCell, StatusPill } from "../../_components/grid";
import { AffectedProductsDisclosure } from "./_components/affected-products";
import {
  CatalogProducts,
  PlatformVerdicts,
} from "./_components/catalog-products";
import {
  QualityShell,
  RowsSkeleton,
  SummarySkeleton,
} from "./_components/shell";

type StoreParams = PageProps<"/[locale]/dashboard/[store]/quality">["params"];

const SURFACE_ICONS: Record<ListingQuality.Surface, ReactNode> = {
  universal: <RadarIcon />,
  google: <GaugeIcon />,
  chatgpt: <BullseyeIcon />,
};

/**
 * Readiness thresholds for this page.
 *
 * Deliberately stricter than the win-rate scale in design.md §4.4: a feed is
 * either accepted or it is not, so "most of the catalog passes" is not a good
 * result the way a 60% win rate is.
 */
const readyTone = (share: number) => {
  switch (true) {
    case share >= 80:
      return "success" as const;
    case share >= 50:
      return "warning" as const;
    default:
      return "error" as const;
  }
};

const Summary = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const report = unwrapEntitled(
    await ListingQuality.auditListings(Environment.SERVER, { store }),
  );
  if (!report) return null;

  return (
    <div className="grid grid-cols-1 gap-px bg-accent-foreground sm:grid-cols-2 xl:grid-cols-4">
      <StatCell
        label={translate("summary.totalLabel")}
        icon={<ShoppingCartIcon />}
        value={report.total}
        detail={translate("summary.totalDetail")}
      />
      {ListingQuality.SURFACES.map((surface) => {
        const summary = report.surfaces[surface];

        return (
          <StatCell
            key={surface}
            label={translate(`platform.${surface}`)}
            icon={SURFACE_ICONS[surface]}
            value={summary.readyShare}
            suffix="%"
            progress={summary.readyShare}
            tone={readyTone(summary.readyShare)}
            detail={
              <span className="flex flex-wrap gap-1.5">
                <StatusPill tone="error">
                  {translate("summary.blockers", {
                    count: String(summary.blockers),
                  })}
                </StatusPill>
                <StatusPill tone="warning">
                  {translate("summary.warnings", {
                    count: String(summary.warnings),
                  })}
                </StatusPill>
                <StatusPill tone="success">
                  {translate("summary.ready", { count: String(summary.ready) })}
                </StatusPill>
              </span>
            }
          />
        );
      })}
    </div>
  );
};

const TopIssues = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const report = unwrapEntitled(
    await ListingQuality.auditListings(Environment.SERVER, { store }),
  );
  if (!report) return null;

  if (report.topIssues.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("issues.empty")}
      </p>
    );

  return (
    <div className="divide-y divide-accent-foreground">
      {report.topIssues.map((issue) => {
        const affected = report.products.filter((product) =>
          product.findings.some((finding) => finding.rule === issue.rule),
        );

        return (
          <div
            key={issue.rule}
            className="flex flex-col gap-2 p-4 sm:grid sm:grid-cols-[9rem_1fr] sm:gap-4"
          >
            <div>
              <StatusPill tone="primary">
                {translate("issues.affected", { count: issue.count })}
              </StatusPill>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <div>
                <p className="font-medium text-foreground text-sm">
                  {translate(`rules.${issue.rule}.title`)}
                </p>
                <p className="mt-1 max-w-3xl text-foreground-dimmed text-sm">
                  {translate(`rules.${issue.rule}.detail`)}
                </p>
              </div>
              <PlatformVerdicts
                universal={issue.universal}
                entries={issue.platforms}
              />
              <AffectedProductsDisclosure
                store={store}
                header={translate("products.headers.product")}
                trigger={translate("issues.viewAffected")}
                products={affected}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Products = async ({ params }: { params: StoreParams }) => {
  await connection();
  const { store } = await params;
  const translate = await getTranslations("dashboard.quality");
  // Renders beneath the paywall overlay for accounts without a plan — see
  // `unwrapEntitled`.
  const report = unwrapEntitled(
    await ListingQuality.auditListings(Environment.SERVER, { store }),
  );
  if (!report) return null;

  if (report.products.length === 0)
    return (
      <p className="p-4 text-foreground-dimmed text-sm">
        {translate("products.empty")}
      </p>
    );

  return <CatalogProducts products={report.products} />;
};

export default ({
  params,
}: PageProps<"/[locale]/dashboard/[store]/quality">) => (
  <QualityShell
    summary={
      <Suspense fallback={<SummarySkeleton />}>
        <Summary params={params} />
      </Suspense>
    }
    issues={
      <Suspense fallback={<RowsSkeleton />}>
        <TopIssues params={params} />
      </Suspense>
    }
    products={
      <Suspense fallback={<RowsSkeleton />}>
        <Products params={params} />
      </Suspense>
    }
  />
);
