"use client";

import {
  ArrowRightIcon,
  CircleBoltIcon,
  CodeIcon,
  CommerceFilePenIcon,
  CreditCardIcon,
  FileIcon,
  FileSearchIcon,
  LoaderIcon,
  PhotoIcon,
  TrendUpIcon,
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
import {
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { AnalysisText } from "@/components/analysis-text";
import { Link, useRouter } from "@/i18n/navigation";
import {
  callOnboardingAction,
  onboardingErrorKey,
} from "@/lib/onboarding-errors";
import * as Audit from "@/server/app/intelligence/audit";
import * as Optimization from "@/server/app/optimization.actions";
import type { ProductChannels as ProductChannelsData } from "@/server/utils/product-channels";
import { DashboardEmptyState } from "../../../../_components/empty-state";
import { StatusPill } from "../../../../_components/grid";
import { DashboardLoadingState } from "../../../../_components/loading-state";
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
    <DashboardEmptyState
      title={translate("states.empty.title")}
      description={translate("states.empty.description")}
      figure="comparison-stand"
      className="border-accent-foreground border-b"
    >
      {children}
    </DashboardEmptyState>
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

const ListingDescription = ({ content }: { content: string | null }) => {
  const listing = useTranslations("dashboard.productWorkspace.listing");
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const descriptionId = useId();
  useEffect(() => {
    const description = descriptionRef.current;
    if (!description || expanded) return;
    const measure = () =>
      setOverflowing(description.scrollHeight > description.clientHeight + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(description);
    measure();
    return () => observer.disconnect();
  }, [expanded]);
  if (!content?.trim()) {
    return (
      <p className="text-foreground-dimmed text-sm leading-6">
        {listing("missingDescription")}
      </p>
    );
  }
  return (
    <>
      <div
        ref={descriptionRef}
        id={descriptionId}
        className={cn(
          "break-words text-foreground text-sm leading-7 [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_ul]:list-disc [&_ul]:pl-5",
          !expanded && "line-clamp-4",
        )}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: ProductContent sanitizes imported description HTML before passing it to the client
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {(overflowing || expanded) && (
        <Button
          variant="soft"
          color="neutral"
          className="mt-3"
          aria-expanded={expanded}
          aria-controls={descriptionId}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? listing("action.tertiary") : listing("action.secondary")}
        </Button>
      )}
    </>
  );
};

const ListingReview = ({
  product,
  structuredData,
  children,
}: {
  product: ProductDetailData["product"];
  structuredData: string | null;
  children: ReactNode;
}) => {
  const fields = useTranslations("dashboard.products.detail.fields");
  const listing = useTranslations("dashboard.productWorkspace.listing");
  const formatter = useFormatter();
  const images = (() => {
    const parsed: unknown = (() => {
      try {
        return JSON.parse(product.images ?? "[]");
      } catch {
        return [];
      }
    })();
    const saved = Array.isArray(parsed)
      ? parsed.filter((image): image is string => typeof image === "string")
      : [];
    return [
      ...new Set(
        [product.image, ...saved].filter(
          (image): image is string =>
            Boolean(image) &&
            typeof image === "string" &&
            (/^https?:\/\//i.test(image) || image.startsWith("/")),
        ),
      ),
    ];
  })();
  // The server score counts the same six saved fields across the catalog.
  // A successful generation saves structured data without reloading this view.
  const present = Math.min(
    6,
    Math.round((product.quality / 100) * 6) +
      Number(Boolean(structuredData) && !product.structuredData),
  );
  const price = (() => {
    if (!product.price?.trim()) return null;
    if (!product.currency || !Number.isFinite(Number(product.price)))
      return product.price;
    return formatter.number(Number(product.price), {
      style: "currency",
      currency: product.currency,
    });
  })();

  return (
    <section
      data-listing-review
      className="min-w-0 border-accent-foreground border-b bg-background-rich"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-accent-foreground border-b px-4 py-5 sm:px-6">
        <div className="min-w-0 max-w-xl">
          <h2 className="font-heading font-semibold text-foreground-rich text-xl">
            {listing("title")}
          </h2>
          <p className="mt-1 text-foreground-dimmed text-sm leading-6">
            {listing("description")}
          </p>
        </div>
        <p className="shrink-0 rounded-full bg-background-dimmed px-3 py-1 font-medium text-foreground text-xs tabular-nums">
          {listing("coverage", {
            present: formatter.number(present),
            total: formatter.number(6),
          })}
        </p>
      </header>
      <div className="grid min-w-0 sm:grid-cols-3">
        <section className="min-w-0 border-accent-foreground border-b px-4 py-5 sm:border-r sm:border-b-0 sm:px-6">
          <h3 className="flex items-center gap-2 font-medium text-foreground-rich text-sm">
            <PhotoIcon aria-hidden className="size-4 text-foreground-dimmed" />
            {fields("images")}
          </h3>
          {images.length ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {images.slice(0, 6).map((image) => (
                <Avatar
                  key={image}
                  className="size-24 rounded-lg border border-accent-foreground bg-background"
                >
                  <AvatarImage
                    src={image}
                    alt={product.title}
                    className="object-contain"
                  />
                  <AvatarFallback className="rounded-lg bg-background-dimmed">
                    <PhotoIcon
                      aria-hidden
                      className="size-8 text-foreground-dimmed"
                    />
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-4 sm:flex-col sm:items-start">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                <PhotoIcon aria-hidden className="size-10" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {listing("missingImages")}
                </p>
                <p className="mt-1 text-foreground-dimmed text-sm leading-6">
                  {listing("imageHint")}
                </p>
              </div>
            </div>
          )}
        </section>
        <div className="min-w-0 sm:col-span-2">
          <section className="border-accent-foreground border-b px-4 py-5 sm:px-6">
            <h3 className="flex items-center gap-2 font-medium text-foreground-dimmed text-xs">
              <FileIcon aria-hidden className="size-4" />
              {fields("title")}
            </h3>
            <p className="mt-2 break-words font-semibold text-foreground-rich text-lg">
              {product.title.trim() || listing("missingValue")}
            </p>
          </section>
          <section className="border-accent-foreground border-b px-4 py-5 sm:px-6">
            <h3 className="mb-2 flex items-center gap-2 font-medium text-foreground-dimmed text-xs">
              <CommerceFilePenIcon aria-hidden className="size-4" />
              {fields("description")}
            </h3>
            <ListingDescription content={product.description} />
          </section>
          <dl className="grid grid-cols-2 divide-x divide-accent-foreground">
            <div className="min-w-0 px-4 py-4 sm:px-6">
              <dt className="flex items-center gap-2 text-foreground-dimmed text-xs">
                <CreditCardIcon aria-hidden className="size-4" />
                {fields("price")}
              </dt>
              <dd className="mt-2 break-words font-medium text-foreground-rich text-sm tabular-nums">
                {price ?? listing("missingValue")}
              </dd>
            </div>
            <div className="min-w-0 px-4 py-4 sm:px-6">
              <dt className="flex items-center gap-2 text-foreground-dimmed text-xs">
                <CodeIcon aria-hidden className="size-4" />
                {fields("sku")}
              </dt>
              <dd className="mt-2 break-words font-medium text-foreground-rich text-sm">
                {product.sku?.trim() || listing("missingValue")}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-t px-4 py-4 sm:px-6">
        <p className="max-w-xl text-foreground-dimmed text-xs leading-5">
          {listing("sourceHint")}
        </p>
        <Button
          variant="soft"
          color="neutral"
          render={<Link href="/dashboard/settings?tab=integrations" />}
        >
          {listing("action.primary")}
          <ArrowRightIcon aria-hidden className="size-4" />
        </Button>
      </footer>
      {children}
    </section>
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
  <div className="grid grid-cols-2 gap-px border-accent-foreground border-b bg-accent-foreground sm:grid-cols-3">
    {auditFieldKeys.map((key) => (
      <div
        key={key}
        className="flex items-start gap-3 bg-background-rich px-4 py-4 sm:px-6"
      >
        <div className="size-5 shrink-0 animate-pulse rounded-sm bg-foreground/10 motion-reduce:animate-none" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-20 animate-pulse bg-foreground/10 motion-reduce:animate-none" />
          <div className="h-3 w-12 animate-pulse rounded-full bg-foreground/10 motion-reduce:animate-none" />
        </div>
      </div>
    ))}
  </div>
);

export const ListingAudit = ({
  product,
}: {
  product: ProductDetailData["product"];
}) => {
  const workspace = useTranslations("dashboard.productWorkspace");
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
      {status === "loading" && (
        <DashboardLoadingState
          title={workspace("audit.running")}
          figure="readiness-scanner"
          compact={audit !== null}
          className="border-accent-foreground border-b"
        />
      )}
      {status === "error" && (
        <p
          role="alert"
          className="border-accent-foreground border-b px-4 py-4 text-error-dimmed text-sm sm:px-6"
        >
          {workspace("audit.failed")}
        </p>
      )}
      {audit && <AuditResult audit={audit} />}
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
  const listing = useTranslations("dashboard.productWorkspace.listing");
  const fields = useTranslations("dashboard.products.detail.fields");
  const applyOptimization = useTranslations(
    "dashboard.products.detail.applyOptimization",
  );
  const publish = useTranslations("dashboard.products.detail.publish");
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

      <ListingReview product={product} structuredData={structuredData}>
        <section className="border-accent-foreground border-t">
          <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-5 sm:px-6">
            <div className="min-w-0 max-w-xl">
              <h3 className="flex items-center gap-2 font-semibold text-base text-foreground-rich">
                <CodeIcon aria-hidden className="size-5 text-primary" />
                {fields("structuredData")}
              </h3>
              <p className="mt-2 text-foreground-dimmed text-sm leading-6">
                {structuredData
                  ? listing("structuredSaved")
                  : listing("structuredMissing")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-foreground-dimmed text-xs">
                <span>{translate("liveOnStore")}</span>
                <StatusPill tone={liveStatus.tone}>
                  {liveStatus.label}
                </StatusPill>
              </div>
              {status === "unreachable" && (
                <p className="mt-2 text-foreground-dimmed text-xs leading-5">
                  {listing("unreachable")}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {embedNotice?.showEnable && themeEditorUrl && (
                <Button
                  type="button"
                  variant="soft"
                  color="neutral"
                  onClick={() => window.open(themeEditorUrl, "_blank")}
                >
                  {translate("enableAppEmbed")}
                  <ArrowRightIcon aria-hidden className="size-4" />
                </Button>
              )}
              {structuredData ? (
                canPublish && (
                  <Button
                    type="button"
                    variant="soft"
                    color="neutral"
                    onClick={publishStructured}
                    disabled={isPublishingStructured}
                    aria-busy={isPublishingStructured}
                  >
                    {isPublishingStructured ? (
                      <LoaderIcon
                        aria-hidden
                        className="size-4 animate-spin motion-reduce:animate-none"
                      />
                    ) : (
                      <ArrowRightIcon aria-hidden className="size-4" />
                    )}
                    {isPublishingStructured
                      ? translate("publishing")
                      : translate("publishStructuredData")}
                  </Button>
                )
              ) : (
                <Button
                  type="button"
                  variant="soft"
                  color="neutral"
                  onClick={handleGenerateJsonLd}
                  disabled={isPending}
                  aria-busy={isPending}
                >
                  {isPending ? (
                    <LoaderIcon
                      aria-hidden
                      className="size-4 animate-spin motion-reduce:animate-none"
                    />
                  ) : (
                    <CodeIcon aria-hidden className="size-4" />
                  )}
                  {isPending
                    ? translate("generating")
                    : translate("generateJsonLd")}
                </Button>
              )}
            </div>
          </div>
          {(structuredData || embedNotice) && (
            <Accordion>
              <AccordionItem
                value="structured-details"
                className="border-accent-foreground border-t"
              >
                <AccordionTrigger className="px-4 py-3 text-foreground text-sm sm:px-6">
                  {listing("action.quaternary")}
                </AccordionTrigger>
                <AccordionPanel>
                  {embedNotice && (
                    <div className="border-accent-foreground border-t bg-background-dimmed px-4 py-4 sm:px-6">
                      <p className="font-medium text-foreground-rich text-sm">
                        {embedNotice.title}
                      </p>
                      <p className="mt-1 text-foreground-dimmed text-sm leading-6">
                        {embedNotice.text}
                      </p>
                    </div>
                  )}
                  {structuredData && (
                    <pre className="max-h-80 max-w-full overflow-auto whitespace-pre-wrap break-all border-accent-foreground border-t bg-background-dimmed px-4 py-4 font-mono text-foreground text-xs leading-6 sm:px-6">
                      {structuredData}
                    </pre>
                  )}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </section>
      </ListingReview>
      <ListingAudit key={product.id} product={product} />
    </>
  );
};
