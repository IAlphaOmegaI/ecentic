import {
  ArrowRightIcon,
  CheckCircleIcon,
  CommerceFilePenIcon,
  HammerIcon,
  RadarIcon,
} from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import * as Optimization from "@/server/app/optimization";
import * as Product from "@/server/app/product";
import { unwrapEntitled } from "@/server/utils/entitlement";
import { Environment } from "@/server/utils/environment";
import { overviewPriorities } from "./priorities";

export const OverviewSummary = async ({
  params,
}: {
  params: PageProps<"/[locale]/dashboard/[store]">["params"];
}) => {
  await connection();
  const { store } = await params;
  const [translate, empty, checks, ready, data, optimizationResult] =
    await Promise.all([
      getTranslations("dashboard.overview.priorities"),
      getTranslations("dashboard.shared.empty"),
      getTranslations("dashboard.overview.priorityChecks"),
      getTranslations("dashboard.workspace.ready"),
      unwrapResult(Product.gatherIntelligence(Environment.SERVER, { store })),
      Optimization.listDashboard(Environment.SERVER, { store }),
    ]);
  const optimization = unwrapEntitled(optimizationResult);
  const {
    hasProducts,
    incompleteCount,
    untestedCount,
    opportunityCount,
    allClear,
  } = overviewPriorities(data.products, optimization);
  const rows = [
    {
      key: "fields",
      active: !hasProducts || incompleteCount > 0,
      icon: CommerceFilePenIcon,
      title: !hasProducts ? empty("noProducts") : checks("incomplete.title"),
      detail: !hasProducts
        ? empty("noProductsHint")
        : checks("incomplete.detail", { count: incompleteCount }),
      href: hasProducts
        ? `/dashboard/${store}/products?sort=quality&direction=asc`
        : `/dashboard/${store}/products/add`,
      action: translate("action.primary"),
    },
    {
      key: "optimize",
      active: opportunityCount !== null && opportunityCount > 0,
      icon: HammerIcon,
      title: translate("optimize.title"),
      detail: translate("optimize.detail", { count: opportunityCount ?? 0 }),
      href: `/dashboard/${store}/optimize`,
      action: translate("action.tertiary"),
    },
    {
      key: "compare",
      active: hasProducts && untestedCount > 0,
      icon: RadarIcon,
      title: translate("compare.title"),
      detail: translate("compare.detail", { count: untestedCount }),
      href: `/dashboard/${store}/simulations`,
      action: translate("action.secondary"),
    },
  ].filter((row) => row.active);

  return (
    <section className="min-w-0 bg-background text-foreground-rich">
      <header className="border-accent-foreground border-b bg-primary/5 px-5 py-4 text-foreground-rich sm:px-6">
        <h2 className="font-heading font-semibold text-lg">
          {translate("title")}
        </h2>
        <p className="mt-1.5 text-foreground-dimmed text-sm leading-5">
          {translate("description")}
        </p>
      </header>
      {rows.length === 0 && (
        <div className="flex items-start gap-3.5 px-5 py-4 sm:px-6">
          {allClear ? (
            <CheckCircleIcon
              aria-hidden
              className="size-7 shrink-0 text-success"
            />
          ) : (
            <HammerIcon
              aria-hidden
              className="size-7 shrink-0 text-foreground-dimmed"
            />
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {allClear ? ready("title") : checks("unavailable.title")}
            </h3>
            <p className="mt-2 text-foreground-dimmed text-sm leading-6">
              {allClear
                ? ready("description")
                : checks("unavailable.description")}
            </p>
            <Link
              href={`/dashboard/${store}/${allClear ? "channels" : "optimize"}`}
              className="mt-3 inline-flex items-center gap-2 font-medium text-primary-text text-sm hover:underline"
            >
              {allClear
                ? ready("action.primary")
                : translate("action.tertiary")}
              <ArrowRightIcon aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      )}
      <ol
        className={cn(
          "grid min-w-0 gap-px bg-accent-foreground",
          rows.length === 2 && "md:grid-cols-2",
          rows.length === 3 && "lg:grid-cols-3",
        )}
      >
        {rows.map(({ key, icon: Icon, title, detail, href, action }) => (
          <li key={key} className="min-w-0 bg-background">
            <Link
              href={href}
              className="group flex h-full w-full min-w-0 gap-3.5 px-5 py-4 -outline-offset-2 transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary sm:px-6"
            >
              <Icon
                aria-hidden
                className="mt-0.5 size-7 shrink-0 text-primary-text"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm leading-5">{title}</h3>
                <p className="mt-1 text-foreground-dimmed text-sm leading-5">
                  {detail}
                </p>
                <span className="mt-2 inline-flex items-center gap-2 font-medium text-primary-text text-sm leading-5">
                  {action}
                  <ArrowRightIcon aria-hidden className="size-3.5 shrink-0" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
};
