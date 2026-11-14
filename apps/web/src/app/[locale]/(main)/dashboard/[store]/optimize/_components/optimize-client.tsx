"use client";

import {
  ArrowRightIcon,
  CheckCircleIcon,
  CheckIcon,
  CircleBoltIcon,
  FileSearchIcon,
  HammerIcon,
  LoaderIcon,
  PhotoIcon,
  SearchIcon,
  XIcon,
} from "@zenncore/icons";
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
import {
  Popover,
  PopoverPopup,
  PopoverPositioner,
  PopoverTrigger,
} from "@zenncore/web/components/popover";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
} from "@zenncore/web/components/select";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import { useFormatter, useTranslations } from "next-intl";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { callOnboardingAction } from "@/lib/onboarding-errors";
import * as Optimization from "@/server/app/optimization";
import { Crosshair } from "../../../_components/grid";
import { listingQueue, matchesListing } from "./queue";
import { OptimizeFeedback } from "./shell";

const diagnosticIcons = {
  content: FileSearchIcon,
  structured_data: CheckCircleIcon,
  seo: PhotoIcon,
  platform: HammerIcon,
};

type Confirmation =
  | { kind: "product"; product: { id: string; title: string } }
  | { kind: "bulk" | "store" };

export const OptimizeClient = ({
  data,
  store,
}: {
  data: Optimization.DashboardData;
  store: string;
}) => {
  const translate = useTranslations("dashboard.optimizeWorkspace");
  const legacy = useTranslations("dashboard.optimize");
  const formatter = useFormatter();
  const router = useRouter();
  const toast = useToastManager();
  const workflow = useTranslations("dashboard.catalogWorkflow");
  const quality = useTranslations("dashboard.qualityWorkspace");
  const [{ search: query, view: tab, work }, setFilters] = useQueryStates({
    search: parseAsString.withDefault(""),
    view: parseAsStringLiteral([
      "queue",
      "published",
      "dismissed",
    ] as const).withDefault("queue"),
    work: parseAsStringLiteral([
      "all",
      "publishable",
      "manual",
    ] as const).withDefault("all"),
  });
  const clearFilters = () => void setFilters({ search: null, work: null });
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const queue = listingQueue(data).filter(
    (item) => !completed.includes(item.product.id),
  );
  const shown = queue.filter(
    (item) =>
      matchesListing(item.product, query) &&
      (work === "all" ||
        (work === "publishable" ? Boolean(item.candidate) : !item.candidate)),
  );
  const pending = data.pending.filter(
    (item) => !completed.includes(item.product.id),
  );
  const canOptimizeStore =
    data.currentStore &&
    ["shopify", "woocommerce"].includes(data.currentStore.platform);
  const reportFailure = () =>
    toast.add({
      title: translate("toast.failed"),
      description: translate("toast.failedDescription"),
      type: "error",
    });

  const [publish, publishing] = useAsyncAction(async () => {
    if (!confirmation) return;
    if (confirmation.kind === "store") {
      const result = await callOnboardingAction(() =>
        Optimization.optimizeStoreForAgents({ store }),
      );
      if (!result.success) {
        reportFailure();
        router.refresh();
        return;
      }
      if (result.data.errors.length > 0) reportFailure();
      else
        toast.add({
          title: translate("toast.published", {
            count: result.data.listingsRewritten,
          }),
          type: "success",
        });
      setConfirmation(null);
      router.refresh();
      return;
    }
    // Explicitly publish only the current store's reviewed candidate set. Keep a
    // successful row out of retries even before the refreshed RSC payload lands.
    const candidates =
      confirmation.kind === "product"
        ? [confirmation.product.id]
        : pending.map((item) => item.product.id);
    const outcomes: { id: string; success: boolean }[] = [];
    for (const id of candidates) {
      const result = await callOnboardingAction(() =>
        Optimization.approveProductListing({ product: id }),
      );
      outcomes.push({ id, success: result.success });
      if (result.success) setCompleted((current) => [...current, id]);
    }
    const published = outcomes.filter((item) => item.success).length;
    const failed = outcomes.length - published;
    toast.add({
      title: failed
        ? translate("toast.failed")
        : translate("toast.published", { count: published }),
      description: failed
        ? translate("toast.partial", {
            published: formatter.number(published),
            failed: formatter.number(failed),
          })
        : undefined,
      type: failed ? "warning" : "success",
    });
    setConfirmation(null);
    router.refresh();
  });

  const [updateQueue, updating] = useAsyncAction(
    async (id: string, kind: "dismiss" | "restore") => {
      setSelected(id);
      const result = await callOnboardingAction(() =>
        kind === "dismiss"
          ? Optimization.dismissSuggestion({ product: id })
          : Optimization.reconsiderSuggestion({ product: id }),
      );
      setSelected(null);
      if (!result.success) {
        reportFailure();
        return;
      }
      toast.add({ title: translate("toast.saved"), type: "success" });
      router.refresh();
    },
  );
  const busy = publishing || updating;
  const published = data.published.filter((record) => {
    const product = data.products[record.productId];
    return product && matchesListing(product, query);
  });
  const dismissed = data.dismissed.filter((record) => {
    const product = data.products[record.productId];
    return product && matchesListing(product, query);
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="relative border-accent-foreground border-b">
        <div className="grid grid-cols-3 divide-x divide-accent-foreground">
          {(
            [
              { key: "candidates", count: pending.length },
              {
                key: "manual",
                count: queue.filter((item) => !item.candidate).length,
              },
              { key: "published", count: data.published.length },
            ] as const
          ).map((metric) => (
            <div
              key={metric.key}
              className="min-w-0 px-4 py-5 first:bg-primary/5 sm:px-6"
            >
              <p className="min-h-10 font-medium text-foreground-dimmed text-xs sm:min-h-6 sm:text-sm">
                {translate(`summary.${metric.key}`)}
              </p>
              <p className="mt-2 font-semibold text-3xl text-foreground-rich tabular-nums">
                {formatter.number(metric.count)}
              </p>
            </div>
          ))}
        </div>
        <Crosshair className="right-0 bottom-0 translate-y-1/2" />
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (
            value === "queue" ||
            value === "published" ||
            value === "dismissed"
          )
            void setFilters({ view: value });
        }}
        className="flex min-w-0 flex-1 flex-col"
      >
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6">
          <TabsList className="max-w-full text-sm">
            <TabsIndicator />
            {(["queue", "published", "dismissed"] as const).map((value) => (
              <Tab key={value} value={value}>
                {translate(`tabs.${value}`)}
              </Tab>
            ))}
          </TabsList>
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="ghost" color="neutral" className="text-sm" />
              }
            >
              <FileSearchIcon className="size-4" />
              {translate("method.title")}
            </PopoverTrigger>
            <PopoverPositioner align="end">
              <PopoverPopup className="max-w-sm rounded-lg p-4 shadow-sm">
                <p className="font-semibold text-foreground-rich">
                  {translate("method.title")}
                </p>
                <p className="mt-2 text-foreground-dimmed text-sm leading-6">
                  {translate("method.description")}
                </p>
              </PopoverPopup>
            </PopoverPositioner>
          </Popover>
          <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        </div>
        <div className="relative border-accent-foreground border-b">
          <div className="relative flex flex-wrap items-start justify-between gap-4 border-accent-foreground border-b px-4 py-5 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-foreground-rich text-xl">
                {tab === "queue"
                  ? translate("queue.title")
                  : translate(
                      `tabs.${tab === "published" ? "published" : "dismissed"}`,
                    )}
              </h2>
              <p className="mt-2 max-w-2xl text-foreground-dimmed text-sm leading-6">
                {tab === "queue"
                  ? translate("queue.description")
                  : tab === "published"
                    ? translate("history.unmeasured")
                    : legacy("states.dismissedEmpty.description")}
              </p>
            </div>
            {tab === "queue" && pending.length > 1 && (
              <Button
                variant="soft"
                color="primary"
                disabled={busy}
                onClick={() => setConfirmation({ kind: "bulk" })}
              >
                {translate("bulk.action")}
                <ArrowRightIcon className="size-4" />
              </Button>
            )}
            <Crosshair className="right-0 bottom-0 translate-y-1/2" />
          </div>
          <div className="flex flex-wrap gap-3 px-4 py-4 sm:px-6">
            <TextField
              value={query}
              onValueChange={(value) =>
                void setFilters({ search: value ?? "" })
              }
              className="min-w-40 flex-1"
            >
              <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
              <TextFieldInput
                aria-label={translate("search")}
                placeholder={translate("search")}
              />
            </TextField>
            {tab === "queue" && (
              <Select
                value={work}
                onValueChange={(value) => {
                  if (
                    value === "all" ||
                    value === "publishable" ||
                    value === "manual"
                  )
                    void setFilters({ work: value });
                }}
              >
                <SelectTrigger
                  className="min-w-40"
                  aria-label={workflow("reviewLabel")}
                >
                  <span>{workflow(work === "all" ? "allWork" : work)}</span>
                </SelectTrigger>
                <SelectPositioner align="end">
                  <SelectPopup>
                    {(["all", "publishable", "manual"] as const).map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {workflow(value === "all" ? "allWork" : value)}
                        </SelectItem>
                      ),
                    )}
                  </SelectPopup>
                </SelectPositioner>
              </Select>
            )}
            {(query || (tab === "queue" && work !== "all")) && (
              <Button variant="ghost" color="neutral" onClick={clearFilters}>
                <XIcon className="size-4" />
                {quality("action.tertiary")}
              </Button>
            )}
          </div>
          <Crosshair className="bottom-0 left-0 translate-y-1/2" />
        </div>
        <TabsPanel value="queue" className="min-w-0 flex-1">
          {shown.length === 0 ? (
            <OptimizeFeedback
              kind={query.trim() || work !== "all" ? "filtered" : "empty"}
              store={store}
              onReset={clearFilters}
            />
          ) : (
            <Accordion className="min-w-0" multiple>
              {shown.map((item) => (
                <AccordionItem
                  key={item.product.id}
                  value={item.product.id}
                  className="min-w-0 border-accent-foreground border-b"
                >
                  <AccordionTrigger
                    className="items-center gap-4 px-4 py-4 sm:px-6"
                    classList={{
                      trigger: {
                        icon: "size-4 shrink-0 text-foreground-dimmed",
                      },
                    }}
                  >
                    <Avatar className="size-10 shrink-0 rounded-lg border border-accent-foreground bg-background">
                      <AvatarImage
                        src={item.image}
                        alt=""
                        className="object-contain"
                      />
                      <AvatarFallback className="rounded-lg bg-primary/5 text-primary">
                        <FileSearchIcon className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate font-semibold text-base text-foreground-rich">
                        {item.product.title.trim() || item.product.id}
                      </span>
                      <span className="mt-1 block truncate font-normal text-foreground-dimmed text-xs">
                        {item.product.sku ? `${item.product.sku} · ` : ""}
                        {item.candidate
                          ? translate("row.ready")
                          : translate("row.manual")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold text-foreground-rich text-lg tabular-nums">
                        {item.rate === null
                          ? "—"
                          : formatter.number(item.rate / 100, {
                              style: "percent",
                              maximumFractionDigits: 0,
                            })}
                      </span>
                      <span className="hidden font-normal text-foreground-dimmed text-xs sm:block">
                        {translate("row.rate")}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionPanel>
                    {(item.insights.length > 0 ||
                      (item.candidate?.models.length ?? 0) > 0) && (
                      <div className="border-accent-foreground border-t bg-primary/5">
                        {item.insights
                          .filter(
                            (insight, position, all) =>
                              all.findIndex(
                                (entry) => entry.category === insight.category,
                              ) === position,
                          )
                          .map((insight) => {
                            const Icon = diagnosticIcons[insight.category];
                            return (
                              <div
                                key={insight.category}
                                className="flex gap-3 border-accent-foreground border-b px-4 py-4 last:border-b-0 sm:px-6"
                              >
                                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                                <div className="min-w-0">
                                  <h3 className="font-medium text-foreground-rich text-sm">
                                    {translate(
                                      `diagnostics.${insight.category}`,
                                    )}
                                  </h3>
                                  <p className="mt-1 text-foreground-dimmed text-sm leading-6">
                                    {translate(
                                      `diagnostics.${insight.category}Hint`,
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        {item.candidate && item.candidate.models.length > 0 && (
                          <p className="px-4 py-3 text-foreground-dimmed text-xs sm:px-6">
                            {translate("row.context", {
                              models: formatter.list(item.candidate.models),
                            })}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 border-accent-foreground border-t px-4 py-4 sm:px-6">
                      <Button
                        variant="soft"
                        color="neutral"
                        render={
                          <Link
                            href={`/dashboard/${store}/products/${item.product.id}?view=optimize`}
                          />
                        }
                      >
                        {translate("action.secondary")}
                        <ArrowRightIcon className="size-4" />
                      </Button>
                      {item.candidate && (
                        <Button
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              kind: "product",
                              product: item.product,
                            })
                          }
                        >
                          <CircleBoltIcon className="size-4" />
                          {translate("action.primary")}
                        </Button>
                      )}
                      {item.candidate && (
                        <Button
                          variant="ghost"
                          color="neutral"
                          disabled={busy}
                          className="sm:ml-auto"
                          onClick={() =>
                            void updateQueue(item.product.id, "dismiss")
                          }
                        >
                          <XIcon className="size-4" />
                          {legacy("dismissAriaLabel")}
                        </Button>
                      )}
                    </div>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          )}
          <footer className="relative flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <Crosshair className="top-0 right-0 -translate-y-1/2" />
            <p className="text-foreground-dimmed text-xs">
              {translate("queue.count", { count: shown.length })}
            </p>
            <Button
              variant="ghost"
              color="primary"
              className="text-sm"
              render={<Link href={`/dashboard/${store}/quality`} />}
            >
              {translate("action.tertiary")}
              <ArrowRightIcon className="size-4" />
            </Button>
            <p className="w-full max-w-3xl text-foreground-dimmed text-xs leading-5">
              {translate("queue.sample")}
            </p>
          </footer>
        </TabsPanel>
        <TabsPanel value="published" className="min-w-0 flex-1">
          {published.length === 0 ? (
            <OptimizeFeedback
              kind={query.trim() ? "filtered" : "published"}
              store={store}
              onReset={clearFilters}
            />
          ) : (
            published.map((record) => (
              <div
                key={record.id}
                className="flex min-w-0 flex-wrap items-center gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6"
              >
                <CheckCircleIcon className="size-5 shrink-0 text-success" />
                <div className="min-w-48 flex-1">
                  <p className="truncate font-semibold text-foreground-rich">
                    {data.products[record.productId]?.title.trim() ||
                      record.productId}
                  </p>
                  <p className="mt-1 text-foreground-dimmed text-xs">
                    {record.publishedAt
                      ? formatter.dateTime(new Date(record.publishedAt), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : translate("history.undated")}
                  </p>
                </div>
                <Button
                  variant="soft"
                  color="neutral"
                  render={
                    <Link
                      href={`/dashboard/${store}/products/${record.productId}?view=optimize`}
                    />
                  }
                >
                  {translate("action.secondary")}
                  <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            ))
          )}
        </TabsPanel>
        <TabsPanel value="dismissed" className="min-w-0 flex-1">
          {dismissed.length === 0 ? (
            <OptimizeFeedback
              kind={query.trim() ? "filtered" : "dismissed"}
              store={store}
              onReset={clearFilters}
            />
          ) : (
            dismissed.map((record) => (
              <div
                key={record.id}
                className="flex min-w-0 flex-wrap items-center gap-3 border-accent-foreground border-b px-4 py-4 sm:px-6"
              >
                <div className="min-w-48 flex-1">
                  <p className="truncate font-semibold text-foreground-rich">
                    {data.products[record.productId]?.title.trim() ||
                      record.productId}
                  </p>
                </div>
                <Button
                  variant="soft"
                  color="neutral"
                  disabled={busy}
                  onClick={() => void updateQueue(record.productId, "restore")}
                >
                  {selected === record.productId && (
                    <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
                  )}
                  {legacy("action.reconsider")}
                </Button>
              </div>
            ))
          )}
        </TabsPanel>
      </Tabs>
      {canOptimizeStore && (
        <footer className="flex flex-wrap items-center justify-between gap-4 border-accent-foreground border-t px-4 py-5 sm:px-6">
          <p className="max-w-xl text-foreground-dimmed text-sm leading-6">
            {translate("confirmation.storeDescription")}
          </p>
          <Button
            variant="soft"
            color="neutral"
            disabled={busy}
            onClick={() => setConfirmation({ kind: "store" })}
          >
            <CircleBoltIcon className="size-4" />
            {translate("store.action")}
          </Button>
        </footer>
      )}
      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open && !publishing) setConfirmation(null);
        }}
      >
        <AlertDialogPopup
          className="rounded-lg"
          classList={{ root: "z-50", backdrop: "z-50" }}
        >
          <AlertDialogTitle className="font-semibold">
            {confirmation?.kind === "store"
              ? translate("confirmation.storeTitle")
              : confirmation?.kind === "bulk"
                ? translate("confirmation.bulkTitle")
                : translate("confirmation.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-6">
            {confirmation?.kind === "product"
              ? translate("confirmation.description", {
                  title:
                    confirmation.product.title.trim() ||
                    confirmation.product.id,
                })
              : confirmation?.kind === "store"
                ? translate("confirmation.storeDescription")
                : translate("confirmation.bulkDescription", {
                    count: pending.length,
                  })}
          </AlertDialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="soft"
              color="neutral"
              disabled={publishing}
              onClick={() => setConfirmation(null)}
            >
              {translate("confirmation.action.secondary")}
            </Button>
            <Button disabled={publishing} onClick={() => void publish()}>
              {publishing ? (
                <LoaderIcon className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              {translate("confirmation.action.primary")}
            </Button>
          </div>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
};
