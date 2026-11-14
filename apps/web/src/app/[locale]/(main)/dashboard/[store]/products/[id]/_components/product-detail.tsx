"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  CircleBoltIcon,
  FileSearchIcon,
  LoaderIcon,
  TrendUpIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@zenncore/web/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@zenncore/web/components/avatar";
import { Button } from "@zenncore/web/components/button";
import type { ColumnDef } from "@zenncore/web/components/data-table";
import {
  DataTable,
  DataTableProvider,
} from "@zenncore/web/components/data-table";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { useToastManager } from "@zenncore/web/components/toast";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { AnalysisText } from "@/components/analysis-text";
import { Link, useRouter } from "@/i18n/navigation";
import {
  callOnboardingAction,
  onboardingErrorKey,
} from "@/lib/onboarding-errors";
import * as Audit from "@/server/app/intelligence/audit";
import * as Optimization from "@/server/app/optimization";
import type { ProductChannels as ProductChannelsData } from "@/server/utils/product-channels";
import { StatusPill } from "../../../../_components/grid";
import { ProductChannels } from "./channel-preview";
import { FindOffers } from "./find-offers";
import { OfferShelf } from "./offer-shelf";
import { ProductMetrics } from "./shell";

export type ProductDetailData = {
  channels?: ProductChannelsData;
  product: {
    id: string;
    title: string;
    description: string | null;
    price: string | null;
    currency: string | null;
    sku: string | null;
    image?: string | null;
    images?: string | null;
    status?: string | null;
    updatedAt?: Date;
    structuredData: string | null;
    /** Single live verdict for the product page's structured data. */
    structuredDataStatus:
      | "ecentic-optimized"
      | "ecentic-standard"
      | "store-default"
      | "ecentic-optimized_embed-off"
      | "missing"
      | "unreachable";
    quality: number;
  };
  winRate: number;
  canPublish: boolean;
  /** Deep link that pre-activates the app embed in the theme editor. */
  themeEditorUrl: string | null;
  models: Array<{
    model: string;
    label: string;
    rate: number;
    wins: number;
    losses: number;
    total: number;
  }>;
  competitors: Array<{
    id: string;
    title: string;
    brand: string | null;
    image: string | null;
    rate: number;
    wins: number;
    total: number;
  }>;
  simulations: Array<{
    id: string;
    model: string;
    winner: string;
    reasoning: string | null;
    productScore: number | null;
    competitorScore: number | null;
    competitorId: string;
    competitorTitle: string;
    createdAt: Date;
  }>;
};

const columns = (
  table: ReturnType<typeof useTranslations<"dashboard.shared.table">>,
  formatter: ReturnType<typeof useFormatter>,
  workspace: ReturnType<typeof useTranslations<"dashboard.productWorkspace">>,
) =>
  [
    {
      accessorKey: "title",
      header: table("competitor"),
      meta: { className: "w-auto min-w-52" },
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-10 shrink-0 rounded-lg border border-accent-foreground bg-background">
            <AvatarImage src={row.original.image ?? undefined} alt="" />
            <AvatarFallback className="font-medium text-foreground-dimmed text-xs">
              {(row.original.title.trim() || row.original.id)
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p
              className="truncate font-medium text-foreground-rich"
              title={row.original.title}
            >
              {row.original.title.trim() || row.original.id}
            </p>
            {row.original.brand && (
              <p className="text-foreground-dimmed text-xs">
                {row.original.brand}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "rate",
      header: table("winRate"),
      meta: { className: "w-36" },
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-foreground-rich tabular-nums">
            {row.original.total
              ? formatter.number(row.original.rate / 100, {
                  style: "percent",
                  maximumFractionDigits: 0,
                })
              : "—"}
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs">
            {row.original.total
              ? workspace("metrics.wins", {
                  wins: formatter.number(row.original.wins),
                  total: formatter.number(row.original.total),
                })
              : workspace("unmeasured")}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "total",
      header: workspace("metrics.comparisons"),
      meta: { className: "w-28 text-right" },
      cell: ({ row }) => (
        <span className="font-medium text-foreground tabular-nums">
          {formatter.number(row.original.total)}
        </span>
      ),
    },
  ] satisfies ColumnDef<
    ProductDetailData["competitors"][number] & { _id: string }
  >[];

const qualityFields = (
  fields: ReturnType<
    typeof useTranslations<"dashboard.products.detail.fields">
  >,
) =>
  [
    { key: "title", label: fields("title") },
    { key: "description", label: fields("description") },
    { key: "price", label: fields("price") },
    { key: "sku", label: fields("sku") },
    { key: "images", label: fields("images") },
    { key: "structuredData", label: fields("structuredData") },
  ] as const;

const Model = {
  ChatGPT: {
    logo: "/images/chatgpt.svg",
  },
  Claude: {
    logo: "/images/claude.svg",
  },
  Gemini: {
    logo: "/images/gemini.svg",
  },
} as const;

const rateColor = (rate: number) => {
  switch (true) {
    case rate >= 60:
      return "text-success-dimmed";
    case rate >= 30:
      return "text-warning-dimmed";
    default:
      return "text-error-dimmed";
  }
};

const barColor = (rate: number) => {
  switch (true) {
    case rate >= 60:
      return "bg-success";
    case rate >= 30:
      return "bg-warning";
    default:
      return "bg-error";
  }
};

const PublishListing = ({
  product,
  canPublish,
  label,
  className,
}: {
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  label?: string;
  className?: string;
}) => {
  const translate = useTranslations("dashboard.products.detail.publish");
  const shared = useTranslations("dashboard.shared");
  const router = useRouter();
  const toast = useToastManager();
  const errorCopy = useTranslations("onboarding.experience.errors");
  const [open, setOpen] = useState(false);
  const defaultLabel = translate("applyFix");
  const workspace = useTranslations("dashboard.productWorkspace");

  const [publish, isPending] = useAsyncAction(async () => {
    const result = await callOnboardingAction(() =>
      Optimization.approveProductListing({
        product: product.id,
      }),
    );
    if (!result.success) {
      toast.add({
        title: translate("failed"),
        description: errorCopy(onboardingErrorKey(result.error)),
        type: "error",
      });
      return;
    }
    toast.add({
      title: translate("successTitle"),
      description: translate("successDescription"),
      type: "success",
    });
    setOpen(false);
    router.refresh();
  });

  return (
    <>
      <Button
        color="primary"
        className={cn("shrink-0", className)}
        disabled={!canPublish}
        onClick={() => setOpen(true)}
      >
        <TrendUpIcon className="size-4" />
        {canPublish ? (label ?? defaultLabel) : translate("connectStore")}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogPopup>
          <AlertDialogTitle>{translate("dialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {workspace("publishDescription", {
              title: product.title.trim() || product.id,
            })}
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <Button
              variant="soft"
              color="neutral"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {shared("cancel")}
            </Button>
            <Button
              color="primary"
              onClick={() => publish()}
              disabled={isPending}
            >
              {isPending
                ? translate("publishing")
                : translate("publishToStore")}
            </Button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
};

const ApplyOptimization = ({
  product,
  winRate,
  canPublish,
  publishLabel,
  reviewQueueHref,
}: {
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  publishLabel?: string;
  reviewQueueHref?: string;
}) => {
  const translate = useTranslations(
    "dashboard.products.detail.applyOptimization",
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 border-accent-foreground border-b bg-background-rich px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3">
        <CircleBoltIcon className="size-7 shrink-0 text-primary" />
        <div>
          <p className="font-semibold text-foreground-rich">
            {translate("title")}
          </p>
          <p className="mt-1 max-w-prose text-foreground-dimmed text-sm leading-relaxed">
            {translate("description")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PublishListing
          product={product}
          winRate={winRate}
          canPublish={canPublish}
          label={publishLabel}
        />
        {reviewQueueHref && (
          <Button
            variant="soft"
            color="neutral"
            render={<Link href={reviewQueueHref} />}
          >
            {translate("reviewQueue")}
            <ArrowRightIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const ProductDetail = ({ data }: ProductDetail.Props) => {
  const { store } = useParams<{ store: string }>();
  const translate = useTranslations("dashboard.productWorkspace");
  const channelCopy = useTranslations("dashboard.productChannels");
  const workflow = useTranslations("dashboard.catalogWorkflow");
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral([
      "channels",
      "overview",
      "replay",
      "battlecard",
      "optimize",
    ] as const).withDefault("channels"),
  );
  const primaryView =
    view === "replay" || view === "battlecard" ? "overview" : view;
  const comparisonView =
    view === "replay" || view === "battlecard" ? view : "overview";
  const [offerVersion, setOfferVersion] = useState(0);
  const onOffersFound = () => setOfferVersion((version) => version + 1);
  const {
    product,
    winRate,
    canPublish,
    themeEditorUrl,
    models,
    competitors,
    simulations,
  } = data;

  return (
    <Tabs
      value={primaryView}
      onValueChange={(value) => {
        if (
          value === "channels" ||
          value === "overview" ||
          value === "optimize"
        )
          void setView(value);
      }}
      className="min-w-0"
    >
      <div className="min-w-0 border-accent-foreground border-b px-4 py-4 sm:px-6">
        <div className="max-w-full overflow-x-auto">
          <TabsList className="min-w-max" aria-label={translate("title")}>
            <TabsIndicator />
            <Tab value="channels">{channelCopy("tab")}</Tab>
            <Tab value="overview">{translate("tabs.overview")}</Tab>
            <Tab value="optimize">{workflow("improveListing")}</Tab>
          </TabsList>
        </div>
      </div>

      <TabsPanel value="channels">
        <ProductChannels product={product} channels={data.channels} />
      </TabsPanel>

      <TabsPanel value="overview">
        <ProductMetrics data={data} />
        <Tabs
          value={comparisonView}
          onValueChange={(value) => {
            if (
              value === "overview" ||
              value === "replay" ||
              value === "battlecard"
            )
              void setView(value);
          }}
        >
          <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
            <div className="max-w-full overflow-x-auto">
              <TabsList
                className="min-w-max"
                aria-label={translate("tabs.overview")}
              >
                <TabsIndicator />
                <Tab value="overview">{workflow("comparisonResults")}</Tab>
                <Tab value="replay">{translate("tabs.replay")}</Tab>
                <Tab value="battlecard">{translate("tabs.battlecard")}</Tab>
              </TabsList>
            </div>
          </div>
          <TabsPanel value="overview">
            <OverviewTab
              store={store}
              product={product.id}
              models={models}
              competitors={competitors}
              offerVersion={offerVersion}
              onOffersFound={onOffersFound}
            />
          </TabsPanel>

          <TabsPanel value="replay">
            <ReplayTab simulations={simulations} competitors={competitors} />
          </TabsPanel>

          <TabsPanel value="battlecard">
            <BattlecardTab
              store={store}
              product={product}
              winRate={winRate}
              canPublish={canPublish}
              competitors={competitors}
              simulations={simulations}
              onOffersFound={onOffersFound}
            />
          </TabsPanel>
        </Tabs>
      </TabsPanel>
      <TabsPanel value="optimize">
        <OptimizeTab
          store={store}
          product={product}
          winRate={winRate}
          canPublish={canPublish}
          themeEditorUrl={themeEditorUrl}
        />
      </TabsPanel>
    </Tabs>
  );
};
export namespace ProductDetail {
  export type Props = {
    data: ProductDetailData;
  };
}

const OverviewTab = ({
  store,
  product,
  models,
  competitors,
  offerVersion,
  onOffersFound,
}: {
  store: string;
  offerVersion: number;
  onOffersFound: () => void;
  product: string;
  models: ProductDetailData["models"];
  competitors: ProductDetailData["competitors"];
}) => {
  const translate = useTranslations("dashboard.products.detail.overview");
  const workspace = useTranslations("dashboard.productWorkspace");
  const table = useTranslations("dashboard.shared.table");
  const formatter = useFormatter();
  const competitorColumns = useMemo(
    () => columns(table, formatter, workspace),
    [table, formatter, workspace],
  );
  return (
    <section className="min-w-0">
      <div className="px-4 py-5 sm:px-6">
        <h2 className="font-heading font-semibold text-foreground-rich text-xl">
          {workspace("models.title")}
        </h2>
        <p className="mt-1 text-foreground-dimmed text-sm">
          {workspace("models.description")}
        </p>
      </div>
      <ul className="divide-y divide-accent-foreground border-accent-foreground border-y">
        {models.map(({ model, label, rate, total }) => {
          const config = Model[label as keyof typeof Model];
          return (
            <li
              key={model}
              className="flex min-w-0 items-center gap-3 px-4 py-4 sm:gap-5 sm:px-6"
            >
              {config?.logo && (
                <Image
                  src={config.logo}
                  alt=""
                  width={20}
                  height={20}
                  className="size-5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground-rich">{label}</p>
                <p className="mt-1 text-foreground-dimmed text-xs">
                  {total
                    ? workspace("models.count", { count: total })
                    : workspace("unmeasured")}
                </p>
              </div>
              <div
                aria-hidden
                className="hidden h-1.5 w-48 overflow-hidden rounded-full bg-accent-foreground sm:block"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${total ? rate : 0}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right font-semibold text-foreground-rich tabular-nums">
                {total
                  ? formatter.number(rate / 100, {
                      style: "percent",
                      maximumFractionDigits: 0,
                    })
                  : "—"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6">
        <h2 className="font-heading font-semibold text-foreground-rich text-xl">
          {translate("winRateVsCompetitor")}
        </h2>
        <Button
          variant="soft"
          color="neutral"
          render={<Link href={`/dashboard/${store}/competitors`} />}
        >
          {translate("viewAll")}
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
      {competitors.length ? (
        <div className="max-w-full overflow-x-auto border-accent-foreground border-b">
          <DataTableProvider
            rows={competitors.map((row) => ({ _id: row.id, ...row }))}
            columns={competitorColumns}
            pageSize={competitors.length}
            handler="client"
          >
            <DataTable
              className="h-auto min-w-144 table-fixed border-b-0"
              classList={{
                "header-cell":
                  "px-4 font-medium normal-case tracking-normal sm:px-6",
                "body-row": "h-16",
                "body-cell": "px-4 py-2 font-normal sm:px-6",
              }}
            />
          </DataTableProvider>
        </div>
      ) : (
        <ComparisonEmpty>
          <FindOffers store={store} product={product} onFound={onOffersFound} />
        </ComparisonEmpty>
      )}
      <OfferShelf
        key={`${product}-${offerVersion}`}
        store={store}
        product={product}
      />
    </section>
  );
};

export const ComparisonEmpty = ({ children }: { children?: ReactNode }) => {
  const translate = useTranslations("dashboard.productWorkspace");
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 border-accent-foreground border-b px-6 py-8 text-center">
      <FileSearchIcon aria-hidden className="size-10 text-foreground-dimmed" />
      <h2 className="font-heading font-semibold text-foreground-rich text-xl">
        {translate("states.empty.title")}
      </h2>
      <p className="max-w-md text-foreground-dimmed text-sm leading-6">
        {translate("states.empty.description")}
      </p>
      {children}
    </div>
  );
};

const replayModelLabel = (modelId: string) => {
  switch (modelId) {
    case "gpt4":
      return "ChatGPT";
    case "claude":
      return "Claude";
    case "gemini":
      return "Gemini";
    case "perplexity":
      return "Perplexity";
    default:
      return modelId;
  }
};

const ReplayTab = ({
  simulations,
  competitors,
}: {
  simulations: ProductDetailData["simulations"];
  competitors: ProductDetailData["competitors"];
}) => {
  const translate = useTranslations("dashboard.products.detail.replay");
  const workspace = useTranslations("dashboard.productWorkspace");
  const formatter = useFormatter();
  const grouped = Array.from(
    new Set(simulations.map((simulation) => simulation.model)),
  ).map((model) => ({
    model,
    label: replayModelLabel(model),
    simulations: simulations.filter((simulation) => simulation.model === model),
  }));
  if (!grouped.length) return <ComparisonEmpty />;
  return (
    <Tabs defaultValue={grouped[0]?.model} className="min-w-0">
      <div className="max-w-full overflow-x-auto border-accent-foreground border-b px-4 py-4 sm:px-6">
        <TabsList aria-label={workspace("models.title")} className="min-w-max">
          <TabsIndicator />
          {grouped.map(({ model, label }) => (
            <Tab key={model} value={model} className="gap-2">
              {Model[label as keyof typeof Model]?.logo && (
                <Image
                  src={Model[label as keyof typeof Model].logo}
                  alt=""
                  width={16}
                  height={16}
                />
              )}
              {label}
            </Tab>
          ))}
        </TabsList>
      </div>
      {grouped.map((group) => (
        <TabsPanel key={group.model} value={group.model}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-accent-foreground border-b px-4 py-4 sm:px-6">
            <h2 className="font-semibold text-foreground-rich">
              {translate("decisionReplay", { model: group.label })}
            </h2>
            <span className="text-foreground-dimmed text-xs">
              {translate("simulationCount", {
                count: group.simulations.length,
              })}
            </span>
          </div>
          <Accordion
            multiple
            defaultValue={group.simulations
              .filter((simulation) => simulation.winner !== "product")
              .slice(0, 1)
              .map((simulation) => simulation.id)}
          >
            {group.simulations.map((simulation) => {
              const won = simulation.winner === "product";
              const competitor = competitors.find(
                (entry) => entry.id === simulation.competitorId,
              );
              return (
                <AccordionItem
                  key={simulation.id}
                  value={simulation.id}
                  className="border-accent-foreground bg-background-rich"
                >
                  <AccordionTrigger className="items-center px-4 py-4 sm:px-6">
                    <Avatar className="size-10 shrink-0 rounded-lg border border-accent-foreground bg-background">
                      <AvatarImage
                        src={competitor?.image ?? undefined}
                        alt=""
                      />
                      <AvatarFallback className="font-medium text-foreground-dimmed text-xs">
                        {(
                          simulation.competitorTitle.trim() ||
                          simulation.competitorId
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                      <span
                        className="min-w-32 flex-1 truncate font-medium"
                        title={simulation.competitorTitle}
                      >
                        {translate("vsCompetitor", {
                          title:
                            simulation.competitorTitle.trim() ||
                            simulation.competitorId,
                        })}
                      </span>
                      <span className="shrink-0 text-foreground-dimmed text-xs tabular-nums">
                        {simulation.productScore === null
                          ? "—"
                          : formatter.number(simulation.productScore)}{" "}
                        ·{" "}
                        {simulation.competitorScore === null
                          ? "—"
                          : formatter.number(simulation.competitorScore)}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium text-xs",
                          won ? "text-success-dimmed" : "text-error-dimmed",
                        )}
                      >
                        {won ? translate("won") : translate("lost")}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionPanel>
                    <div className="border-accent-foreground border-t px-4 py-5 sm:px-6">
                      <p className="mb-2 font-medium text-foreground-rich text-sm">
                        {translate("reasoning", { model: group.label })}
                      </p>
                      <p className="max-w-3xl whitespace-pre-line break-words text-foreground-dimmed text-sm leading-7">
                        {simulation.reasoning ? (
                          <AnalysisText
                            text={simulation.reasoning}
                            terms={[group.label, simulation.competitorTitle]}
                          />
                        ) : (
                          workspace("noReasoning")
                        )}
                      </p>
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              );
            })}
          </Accordion>
        </TabsPanel>
      ))}
    </Tabs>
  );
};

const ListingCompleteness = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => {
  const fields = useTranslations("dashboard.products.detail.fields");
  const shared = useTranslations("dashboard.shared");

  return (
    <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
      {qualityFields(fields).map(({ key, label }) => {
        const value = product[key];
        const filled = (() => {
          if (!value) return false;
          if (key === "images") return value !== "[]";
          return true;
        })();

        return (
          <div
            key={key}
            className="flex items-center justify-between gap-4 bg-background-rich px-4 py-4 sm:px-6"
          >
            <div className="flex items-center gap-3">
              {filled ? (
                <CheckIcon className="size-5 text-success-dimmed" />
              ) : (
                <XIcon className="size-5 text-foreground-dimmed" />
              )}
              <span className="font-medium text-foreground">{label}</span>
            </div>
            <span
              className={cn(
                "font-medium text-sm",
                filled ? "text-foreground" : "text-foreground-dimmed",
              )}
            >
              {filled ? shared("present") : shared("missing")}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const auditFieldKeys = [
  "title",
  "description",
  "price",
  "sku",
  "structuredData",
  "images",
] as const;

export const AuditSkeleton = () => (
  <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
    {auditFieldKeys.map((key) => (
      <div
        key={key}
        className="flex items-center justify-between bg-background-rich px-4 py-4"
      >
        <div className="h-4 w-40 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
        <div className="h-2 w-32 animate-pulse rounded-full bg-foreground/10 motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);

export const ListingAudit = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => {
  const _auditCopy = useTranslations("dashboard.products.detail.audit");
  const workspace = useTranslations("dashboard.productWorkspace");
  const _fields = useTranslations("dashboard.products.detail.fields");
  const [audit, setAudit] = useState<Audit.Type | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const requestReview = async () => {
    setStatus("loading");
    const result = await callOnboardingAction(() =>
      Audit.auditProduct({ product: product.id }),
    );
    if (!result.success) {
      setStatus("error");
      return;
    }
    setAudit(result.data);
    setStatus("ready");
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-4 py-5 sm:px-6">
        <div className="min-w-0 max-w-xl">
          <h2 className="font-heading font-semibold text-foreground-rich text-xl">
            {workspace("audit.title")}
          </h2>
          <p className="mt-1 text-foreground-dimmed text-sm leading-6">
            {workspace("audit.description")}
          </p>
        </div>
        <Button
          variant="soft"
          color="neutral"
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          onClick={() => void requestReview()}
        >
          {status === "loading" ? (
            <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <FileSearchIcon className="size-4" />
          )}
          {status === "error"
            ? workspace("action.secondary")
            : workspace("action.primary")}
        </Button>
      </div>
      {status === "loading" ? (
        <div role="status" aria-label={workspace("audit.running")}>
          <AuditSkeleton />
        </div>
      ) : status === "ready" && audit ? (
        <AuditResult audit={audit} />
      ) : (
        <>
          {status === "error" && (
            <p
              role="alert"
              className="border-accent-foreground border-b px-4 py-4 text-error-dimmed text-sm sm:px-6"
            >
              {workspace("audit.failed")}
            </p>
          )}
          <div className="border-accent-foreground border-b px-4 py-4 sm:px-6">
            <h3 className="font-semibold text-foreground-rich">
              {workspace("audit.savedFields")}
            </h3>
            <p className="mt-1 text-foreground-dimmed text-xs">
              {workspace("audit.coverageDescription")}
            </p>
          </div>
          <ListingCompleteness product={product} />
        </>
      )}
    </>
  );
};

export const AuditResult = ({ audit }: { audit: Audit.Type }) => {
  const auditCopy = useTranslations("dashboard.products.detail.audit");
  const fields = useTranslations("dashboard.products.detail.fields");
  return (
    <>
      <div className="flex items-center justify-between border-accent-foreground border-b bg-background-rich px-4 py-3">
        <h3 className="font-semibold text-foreground-rich">
          {auditCopy("aiContentQuality")}
        </h3>
        <p
          className={cn(
            "font-bold text-2xl tabular-nums tracking-tight",
            rateColor(audit.overall),
          )}
        >
          {audit.overall}
          <span className="font-medium text-foreground-dimmed text-sm">
            /100
          </span>
        </p>
      </div>

      <div className="border-accent-foreground border-b bg-background-rich p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground-rich">
              {auditCopy("brandPositioning")}
            </h3>
            <p className="mt-1 font-medium text-foreground">
              {audit.positioning.audience}
            </p>
            <p className="text-foreground-dimmed text-sm">
              {audit.positioning.position}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "font-bold text-3xl tabular-nums tracking-tight",
                rateColor(audit.positioning.score),
              )}
            >
              {audit.positioning.score}
              <span className="font-medium text-base text-foreground-dimmed">
                /100
              </span>
            </p>
            <p className="text-foreground-dimmed text-xs">
              {auditCopy("positioning")}
            </p>
          </div>
        </div>
        <p className="mt-3 break-words text-foreground-dimmed text-sm leading-relaxed">
          {audit.positioning.reasoning}
        </p>
        <p className="mt-2 break-words text-primary-text text-sm leading-relaxed">
          {audit.positioning.suggestion}
        </p>
      </div>

      <div className="divide-y divide-accent-foreground border-accent-foreground border-b">
        {audit.fields.map((field) => (
          <div
            key={field.key}
            className="flex flex-col gap-2 bg-background-rich px-4 py-4 transition-colors hover:bg-background sm:flex-row sm:items-center sm:justify-between sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-medium text-foreground">
                  {fields(
                    field.key as
                      | "title"
                      | "description"
                      | "price"
                      | "sku"
                      | "structuredData"
                      | "images",
                  )}
                </span>
                <span className="text-foreground-dimmed text-xs">
                  {field.verdict}
                </span>
              </div>
              <p className="mt-1 break-words text-foreground-dimmed text-sm leading-relaxed">
                {field.suggestion}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:w-44">
              <div className="h-1.5 flex-1 rounded-full bg-accent-foreground">
                <div
                  className={cn("h-full rounded-full", barColor(field.score))}
                  style={{ width: `${field.score}%` }}
                />
              </div>
              <span
                className={cn(
                  "w-10 text-right font-semibold text-sm tabular-nums",
                  rateColor(field.score),
                )}
              >
                {field.score}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

// Won/Lost rendered identically apart from tone, so it lives in one place.
const Outcome = ({
  tone,
  label,
  simulations,
  emptyLabel,
}: {
  tone: "success" | "error";
  label: string;
  simulations: ProductDetailData["simulations"];
  emptyLabel: string;
}) => {
  const translate = useTranslations("dashboard.productWorkspace");
  const formatter = useFormatter();
  return (
    <section className="min-w-0 bg-background-rich px-4 py-5 sm:px-6">
      <h3
        className={cn(
          "mb-4 font-semibold text-sm",
          tone === "success" ? "text-success-dimmed" : "text-error-dimmed",
        )}
      >
        {label} · {formatter.number(simulations.length)}
      </h3>
      {simulations.length ? (
        <ol className="space-y-5">
          {simulations.map((simulation) => (
            <li key={simulation.id}>
              <p className="mb-1 font-medium text-foreground-rich text-xs">
                {replayModelLabel(simulation.model)}
              </p>
              <p className="whitespace-pre-line break-words text-foreground-dimmed text-sm leading-6">
                {simulation.reasoning ? (
                  <AnalysisText
                    text={simulation.reasoning}
                    terms={[
                      replayModelLabel(simulation.model),
                      simulation.competitorTitle,
                    ]}
                  />
                ) : (
                  translate("noReasoning")
                )}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-foreground-dimmed text-sm">{emptyLabel}</p>
      )}
    </section>
  );
};

const BattlecardTab = ({
  store,
  product,
  competitors,
  simulations,
  onOffersFound,
}: {
  store: string;
  onOffersFound: () => void;
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  competitors: ProductDetailData["competitors"];
  simulations: ProductDetailData["simulations"];
}) => {
  const translate = useTranslations("dashboard.products.detail.battlecard");
  const workspace = useTranslations("dashboard.productWorkspace");
  const formatter = useFormatter();
  if (!competitors.length)
    return (
      <ComparisonEmpty>
        <FindOffers
          store={store}
          product={product.id}
          onFound={onOffersFound}
        />
      </ComparisonEmpty>
    );
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6">
        <h2 className="font-heading font-semibold text-foreground-rich text-xl">
          {translate("headToHead")}
        </h2>
        <span className="text-foreground-dimmed text-sm">
          {workspace("metrics.competitors", { count: competitors.length })}
        </span>
      </div>
      <Accordion multiple>
        {competitors.map((competitor) => {
          const rows = simulations.filter(
            (simulation) => simulation.competitorId === competitor.id,
          );
          const wins = rows.filter(
            (simulation) => simulation.winner === "product",
          );
          const losses = rows.filter(
            (simulation) => simulation.winner !== "product",
          );
          const title = competitor.title.trim() || competitor.id;
          return (
            <AccordionItem
              key={competitor.id}
              value={competitor.id}
              className="border-accent-foreground bg-background-rich"
            >
              <AccordionTrigger className="items-center px-4 py-4 sm:px-6">
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar className="size-10 shrink-0 rounded-lg border border-accent-foreground bg-background">
                    <AvatarImage src={competitor.image ?? undefined} alt="" />
                    <AvatarFallback className="font-medium text-foreground-dimmed text-xs">
                      {title.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate font-semibold text-foreground-rich"
                      title={title}
                    >
                      {title}
                    </span>
                    <span className="mt-1 block text-foreground-dimmed text-xs">
                      {workspace("models.count", { count: competitor.total })}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-foreground-rich text-lg tabular-nums">
                    {competitor.total
                      ? formatter.number(competitor.rate / 100, {
                          style: "percent",
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionPanel>
                <div className="grid min-w-0 divide-y divide-accent-foreground border-accent-foreground border-t md:grid-cols-2 md:divide-x md:divide-y-0">
                  <Outcome
                    tone="success"
                    label={translate("won")}
                    simulations={wins}
                    emptyLabel={translate("noWins")}
                  />
                  <Outcome
                    tone="error"
                    label={translate("lost")}
                    simulations={losses}
                    emptyLabel={translate("noLosses")}
                  />
                </div>
              </AccordionPanel>
            </AccordionItem>
          );
        })}
      </Accordion>
    </>
  );
};

// Collapses a listing field to a row carrying its status, so the tab shows
// what's wrong at a glance instead of three always-open content dumps.
const ListingField = ({
  label,
  status,
  tone,
  children,
}: {
  label: string;
  status: string;
  tone: "success" | "error" | "neutral";
  children: ReactNode;
}) => (
  <AccordionItem
    value={label}
    className="border-accent-foreground border-b bg-background-rich"
  >
    {/* The trigger is a <button>, so its contents must be phrasing content. */}
    <AccordionTrigger
      className="items-center px-4 py-4 hover:bg-background-dimmed/40 sm:px-6"
      classList={{
        trigger: {
          icon: "size-4 shrink-0 text-foreground-dimmed group-data-panel-open:rotate-180",
        },
      }}
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <span className="font-medium text-foreground-dimmed text-sm tracking-normal">
          {label}
        </span>
        <StatusPill tone={tone}>{status}</StatusPill>
      </span>
    </AccordionTrigger>
    <AccordionPanel>
      <div className="border-accent-foreground border-t">{children}</div>
    </AccordionPanel>
  </AccordionItem>
);

const OptimizeTab = ({
  store,
  product,
  winRate,
  canPublish,
  themeEditorUrl,
}: {
  store: string;
  product: ProductDetailData["product"];
  winRate: number;
  canPublish: boolean;
  themeEditorUrl: string | null;
}) => {
  const translate = useTranslations("dashboard.products.detail.optimizeTab");
  const formatter = useFormatter();
  const fields = useTranslations("dashboard.products.detail.fields");
  const applyOptimization = useTranslations(
    "dashboard.products.detail.applyOptimization",
  );
  const publish = useTranslations("dashboard.products.detail.publish");
  const shared = useTranslations("dashboard.shared");
  const toast = useToastManager();
  const errorCopy = useTranslations("onboarding.experience.errors");
  const [isPending, startTransition] = useTransition();
  const [liveStructuredData, setLiveStructuredData] = useState<string | null>(
    null,
  );

  const structuredData = liveStructuredData ?? product.structuredData;

  const status = product.structuredDataStatus;

  // One verdict for what AI agents read on the live page, worst to best:
  // missing / ecentic-optimized_embed-off → store-default → ecentic-standard
  // → ecentic-optimized.
  const liveStatus = {
    "ecentic-optimized": {
      tone: "success" as const,
      label: translate("status.optimizedByEcentic"),
    },
    "ecentic-standard": {
      tone: "success" as const,
      label: translate("status.ecenticStandard"),
    },
    "store-default": {
      tone: "neutral" as const,
      label: translate("status.storeDefault"),
    },
    "ecentic-optimized_embed-off": {
      tone: "error" as const,
      label: translate("status.optimizedEmbedOff"),
    },
    missing: {
      tone: "error" as const,
      label: translate("status.noStructuredData"),
    },
    unreachable: {
      tone: "neutral" as const,
      label: translate("status.pageUnreachable"),
    },
  }[status];

  // Guidance per status: no structured data → enable the embed (a one-time,
  // store-wide toggle); default markup (store's or ecentic's) → suggest the
  // optimized version. Only `ecentic-optimized` needs nothing.
  const embedNotice = (() => {
    switch (status) {
      case "ecentic-optimized_embed-off":
        return {
          intent: "problem" as const,
          title: translate("embedNotice.embedOffTitle"),
          text: translate("embedNotice.embedOffText"),
          showEnable: true,
        };
      case "missing":
        return {
          intent: "problem" as const,
          title: translate("embedNotice.missingTitle"),
          text: translate("embedNotice.missingText"),
          showEnable: true,
        };
      case "store-default":
        return {
          intent: "problem" as const,
          title: translate("embedNotice.storeDefaultTitle"),
          text: translate("embedNotice.storeDefaultText"),
          showEnable: true,
        };
      case "ecentic-standard":
        return {
          intent: "suggestion" as const,
          title: translate("embedNotice.standardTitle"),
          text: translate("embedNotice.standardText"),
          showEnable: false,
        };
      default:
        return null;
    }
  })();

  const handleGenerateJsonLd = () => {
    startTransition(async () => {
      const generation = await callOnboardingAction(() =>
        Optimization.generateStructuredData({
          product: product.id,
        }),
      );
      if (!generation.success) {
        toast.add({
          title: translate("generationFailed"),
          description: errorCopy(onboardingErrorKey(generation.error)),
          type: "error",
        });
        return;
      }
      setLiveStructuredData(generation.data.structuredData);
    });
  };

  const [publishStructured, isPublishingStructured] = useAsyncAction(
    async () => {
      const result = await callOnboardingAction(() =>
        Optimization.publishProductStructuredData({
          product: product.id,
        }),
      );

      if (!result.success) {
        toast.add({
          title: publish("failed"),
          description: errorCopy(onboardingErrorKey(result.error)),
          type: "error",
        });
        return;
      }
      setLiveStructuredData(result.data.structuredData);

      const { themeEditorUrl } = result.data;
      toast.add({
        title: translate("structuredDataPublished"),
        description: translate("structuredDataPublishedDescription"),
        type: "success",
        ...(themeEditorUrl && {
          actionLabel: translate("openThemeEditor"),
          onAction: () => window.open(themeEditorUrl, "_blank"),
        }),
      });
    },
  );

  return (
    <>
      {/* The primary action used to sit in the right half of a 2-col grid,
          beside a stray paragraph. It leads now. */}
      <ApplyOptimization
        product={product}
        winRate={winRate}
        canPublish={canPublish}
        publishLabel={applyOptimization("optimizePublish")}
        reviewQueueHref={`/dashboard/${store}/optimize`}
      />

      <ListingAudit key={product.id} product={product} />

      <div className="relative border-accent-foreground border-b px-4 py-5 sm:px-6">
        <h2 className="font-heading font-semibold text-foreground-rich text-xl">
          {translate("currentListing")}
        </h2>
      </div>

      {/* Same treatment as the battlecard. Each field collapses to a row with
          its status, and anything that needs attention starts expanded — so the
          fix is one click away without three content dumps (each with its own
          nested scrollbar) sitting open by default. */}
      <Accordion
        multiple
        className="text-foreground"
        defaultValue={[
          ...(product.description ? [] : [fields("description")]),
          // The goal state needs no attention; every other status has a next
          // step waiting inside.
          ...(status === "ecentic-optimized" ? [] : [fields("structuredData")]),
        ]}
      >
        <ListingField
          label={fields("title")}
          tone="neutral"
          status={translate("characters", {
            count: formatter.number(product.title.length),
          })}
        >
          <p className="px-4 py-5 text-foreground sm:px-6">{product.title}</p>
        </ListingField>

        <ListingField
          label={fields("description")}
          tone={product.description ? "success" : "error"}
          status={product.description ? shared("present") : shared("missing")}
        >
          {product.description ? (
            <div
              className="break-words px-4 py-5 text-foreground text-sm leading-relaxed sm:px-6 [&_ol]:mt-1 [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-2 [&_ul]:mt-1 [&_ul]:list-disc [&_ul]:pl-4"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: product description is HTML sourced from the user's own store
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className="px-4 py-5 text-foreground-dimmed text-sm sm:px-6">
              {translate("noDescription")}
            </p>
          )}
        </ListingField>

        {/* The collapsed row reports the live page, not our database — a green
            "Generated" beside a page with no markup is exactly the lie that
            sent us looking here in the first place. */}
        <ListingField
          label={fields("structuredData")}
          tone={liveStatus.tone}
          status={liveStatus.label}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground-dimmed text-sm tracking-normal">
                {translate("liveOnStore")}
              </span>
              <StatusPill tone={liveStatus.tone}>{liveStatus.label}</StatusPill>
            </div>
            <span className="text-foreground-dimmed text-xs">
              {translate("whatAgentsRead")}
            </span>
          </div>

          {embedNotice && (
            <div
              className={cn(
                "border-accent-foreground border-b px-4 py-5 sm:px-6",
                embedNotice.intent === "problem"
                  ? "bg-warning/5"
                  : "bg-background-dimmed",
              )}
            >
              <p
                className={cn(
                  "font-medium text-sm tracking-normal",
                  embedNotice.intent === "problem"
                    ? "text-warning-dimmed"
                    : "text-foreground-dimmed",
                )}
              >
                {embedNotice.title}
              </p>
              <p className="mt-1 text-foreground text-sm">{embedNotice.text}</p>
              {embedNotice.showEnable && themeEditorUrl && (
                <Button
                  type="button"
                  color="neutral"
                  className="mt-3"
                  onClick={() => window.open(themeEditorUrl, "_blank")}
                >
                  {translate("enableAppEmbed")}
                  <ArrowRightIcon className="size-4" />
                </Button>
              )}
            </div>
          )}

          {structuredData ? (
            <div className="space-y-0">
              <p className="px-4 py-5 text-foreground-dimmed text-sm sm:px-6">
                {translate("structuredDataHelp", {
                  metafield: "ecentic.structured_data",
                })}
              </p>
              {/* JSON-LD is genuinely unbounded, so this one keeps a cap. */}
              <pre className="max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-all bg-background-dimmed px-4 py-5 font-mono text-foreground-dimmed text-xs leading-relaxed sm:px-6">
                {structuredData}
              </pre>
              {canPublish && (
                <Button
                  type="button"
                  color="neutral"
                  className="m-4 sm:mx-6"
                  onClick={publishStructured}
                  disabled={isPublishingStructured}
                >
                  {isPublishingStructured
                    ? translate("publishing")
                    : translate("publishStructuredData")}
                  {!isPublishingStructured && (
                    <ArrowRightIcon className="size-4" />
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 px-4 py-5 sm:px-6">
              <p className="text-foreground-dimmed text-sm">
                {translate("noStructuredDataYet")}
              </p>
              <Button
                type="button"
                color="neutral"
                onClick={handleGenerateJsonLd}
                disabled={isPending}
              >
                {isPending
                  ? translate("generating")
                  : translate("generateJsonLd")}
                {!isPending && <ArrowRightIcon className="size-4" />}
              </Button>
            </div>
          )}
        </ListingField>
      </Accordion>
    </>
  );
};
