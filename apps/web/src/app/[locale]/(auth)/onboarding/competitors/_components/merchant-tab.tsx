"use client";

import { CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectPositioner,
  SelectTrigger,
} from "@zenncore/web/components/select";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Spring } from "@/lib/animations";
import type * as Competitor from "@/server/app/competitor";
import * as GoogleMerchant from "@/server/app/integration/google-merchant";
import * as Merchant from "@/server/app/intelligence/merchant";
import { ErrorNotice } from "./competitor-results";

export namespace MerchantTab {
  export type Props = {
    onSuccess?: (competitors: Competitor.Type[]) => void;
    store: string;
    className?: string;
  };
}

const percent = (ratio: number | null) =>
  ratio === null ? null : `${Math.round(ratio * 100)}%`;

/**
 * Reasons travel as kebab-case discriminants but message keys are camelCase, so
 * the two are bridged explicitly rather than by interpolating the reason into a
 * template — which typechecks as a union of keys that do not exist.
 */
const REASON_KEYS = {
  unsupported: "reason.unsupported",
  unlinked: "reason.unlinked",
  "unknown-category": "reason.unknownCategory",
  "no-data": "reason.noData",
} as const;

/**
 * The measured competitor source: rivals Google reports against this store's
 * own Merchant Center impressions, rather than rivals a model named.
 *
 * Unlike the other three tabs this one has prerequisites — a supported
 * platform, a linked Merchant Center account, a resolvable category, and
 * enough impression history for Google to report on — so most of the surface
 * here is the four ways it can legitimately have nothing to show. Each is a
 * state the merchant can act on, so each gets its own explanation rather than
 * an error.
 */
export const MerchantTab = ({
  onSuccess,
  store,
  className,
}: MerchantTab.Props) => {
  const toast = useToastManager();
  const translate = useTranslations("onboarding.competitors.merchant");

  const [report, setReport] =
    useState<GoogleMerchant.CompetitiveVisibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [validation, setValidation] = useState<{
    confirmed: number;
    total: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const latestRequest = useRef(0);

  /**
   * Deliberately not `useAsyncAction`: that hook rebuilds its callback on every
   * render (its `useCallback` closes over the inline action and its own last
   * result), so depending on it from an effect re-runs the fetch forever. Keyed
   * on `store` alone, this stays referentially stable.
   */
  const load = useCallback(
    async (overrides?: {
      categoryId?: number;
      trafficSource?: "ADS" | "ORGANIC";
    }) => {
      // Switching category twice in quick succession leaves two requests in
      // flight, and Google answers them out of order often enough to matter.
      // Only the newest is allowed to commit, so the panel always shows the
      // filters the merchant last picked.
      latestRequest.current += 1;
      const request = latestRequest.current;

      setIsLoading(true);
      setError(null);

      const result = await GoogleMerchant.getCompetitiveVisibility({
        store,
        categoryId: overrides?.categoryId,
        trafficSource: overrides?.trafficSource,
      });

      if (request !== latestRequest.current) return;

      setLoaded(true);
      setIsLoading(false);

      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setReport(result.data);
      setSelected([]);
      // The summary was computed against the previous filters; keeping it on
      // screen would attribute it to the new ones.
      setValidation(null);
    },
    [store],
  );

  // Runs once for the tab's lifetime — the panel is `keepMounted`, so this does
  // not re-fire on every tab switch. An unlinked store never reaches Google:
  // the action answers "unlinked" from our own tables.
  useEffect(() => {
    void load();
  }, [load]);

  const [handleAdd, isAdding] = useAsyncAction(async () => {
    if (selected.length === 0) return;

    const result = await Merchant.importMeasuredCompetitors({
      store,
      domains: selected,
      categoryId: report?.categoryId ?? undefined,
      trafficSource: report?.trafficSource,
    });

    if (!result.success) {
      setError(result.error.message);
      toast.add({
        title: translate("toast.failed"),
        description: result.error.message,
        type: "error",
      });
      return;
    }

    setSelected([]);
    onSuccess?.(result.data);
    toast.add({
      title: translate("toast.added.title"),
      description: translate("toast.added.description", {
        count: String(result.data.length),
      }),
      type: "success",
    });
  });

  const [handleValidate, isValidating] = useAsyncAction(async () => {
    const result = await Merchant.validateAgainstGoogle({
      store,
      categoryId: report?.categoryId ?? undefined,
      trafficSource: report?.trafficSource,
    });

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    setValidation({
      confirmed: result.data.confirmed,
      total: result.data.verdicts.length,
    });
  });

  const toggle = (domain: string) =>
    setSelected((previous) =>
      previous.includes(domain)
        ? previous.filter((entry) => entry !== domain)
        : [...previous, domain],
    );

  const categories = report?.categories ?? [];
  const rivals = report?.rivals ?? [];

  return (
    <div
      className={cn("relative flex h-full flex-col overflow-hidden", className)}
    >
      <div className="border-accent-foreground border-b bg-background-dimmed p-4">
        <p className="mb-1 font-medium text-foreground text-sm">
          {translate("label")}
        </p>
        <p className="text-foreground-dimmed text-xs">
          {translate("description")}
        </p>

        {report &&
          report.reason !== "unsupported" &&
          report.reason !== "unlinked" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Select
                value={report.categoryId ? String(report.categoryId) : null}
                onValueChange={(value: string | null) => {
                  if (!value) return;
                  // Both filters travel on every reload: omitting one would let
                  // the server fall back to re-deriving it and silently undo the
                  // merchant's other choice.
                  void load({
                    categoryId: Number(value),
                    trafficSource: report.trafficSource,
                  });
                }}
              >
                <SelectTrigger className="h-8 min-w-48 bg-background-rich px-2.5 text-sm">
                  {report.categoryName ?? translate("categoryPlaceholder")}
                </SelectTrigger>
                <SelectPositioner>
                  <SelectPopup>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={String(category.id)}
                        label={category.name}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </SelectPositioner>
              </Select>

              <Select
                value={report.trafficSource}
                onValueChange={(value: string | null) => {
                  if (value !== "ADS" && value !== "ORGANIC") return;
                  void load({
                    categoryId: report.categoryId ?? undefined,
                    trafficSource: value,
                  });
                }}
              >
                <SelectTrigger className="h-8 min-w-32 bg-background-rich px-2.5 text-sm">
                  {translate(
                    report.trafficSource === "ADS"
                      ? "traffic.ads"
                      : "traffic.organic",
                  )}
                </SelectTrigger>
                <SelectPositioner>
                  <SelectPopup>
                    <SelectItem
                      value="ORGANIC"
                      label={translate("traffic.organic")}
                    >
                      {translate("traffic.organic")}
                    </SelectItem>
                    <SelectItem value="ADS" label={translate("traffic.ads")}>
                      {translate("traffic.ads")}
                    </SelectItem>
                  </SelectPopup>
                </SelectPositioner>
              </Select>

              <span className="text-foreground-dimmed text-xs">
                {translate("country", { country: report.country })}
              </span>
            </div>
          )}

        {error && (
          <div className="mt-3">
            <ErrorNotice title={translate("toast.failed")} message={error} />
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {(!loaded || isLoading) && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 items-center justify-center gap-3 p-8"
          >
            {[0, 0.2, 0.4].map((delay) => (
              <motion.span
                key={delay}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1,
                  repeat: Number.POSITIVE_INFINITY,
                  delay,
                  ease: "easeInOut",
                }}
                className="inline-block size-1.5 rounded-full bg-primary"
              />
            ))}
            <span className="text-foreground-dimmed text-sm">
              {translate("loading")}
            </span>
          </motion.div>
        )}

        {loaded && !isLoading && report?.reason && rivals.length === 0 && (
          <motion.div
            key={report.reason}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
          >
            <p className="max-w-md text-foreground-dimmed text-sm">
              {translate(REASON_KEYS[report.reason])}
            </p>

            {report.reason === "unlinked" && (
              <Button
                color="primary"
                type="button"
                render={<Link href={`/dashboard/${store}/google-shopping`} />}
                className="h-9 px-4 text-sm"
              >
                {translate("action.connect")}
              </Button>
            )}
          </motion.div>
        )}

        {loaded && !isLoading && rivals.length > 0 && (
          <motion.div
            key="rivals"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <ScrollArea className="min-h-0 flex-1 bg-background-rich">
              {rivals.map((rival) => {
                const isSelected = selected.includes(rival.domain);
                const overlap = percent(rival.pageOverlapRate);
                const higher = percent(rival.higherPositionRate);

                return (
                  <motion.button
                    key={rival.domain}
                    type="button"
                    onClick={() => toggle(rival.domain)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={Spring.Snappy}
                    className={cn(
                      "flex w-full items-center gap-3 border-accent-foreground border-b p-3 text-left transition-colors last:border-b-0 hover:bg-background-dimmed/40",
                      isSelected && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center border border-accent-foreground",
                        isSelected && "border-primary bg-primary text-white",
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3.5" />}
                    </span>

                    <span className="w-8 shrink-0 font-medium text-foreground-dimmed text-xs tabular-nums">
                      #{rival.rank}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-foreground text-sm">
                        {rival.domain}
                      </span>
                      <span className="block text-foreground-dimmed text-xs">
                        {[
                          overlap && translate("overlap", { value: overlap }),
                          higher && translate("higher", { value: higher }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </motion.button>
                );
              })}
            </ScrollArea>

            {/* The other half of this source: not just who Google measured,
                but how much of the roster the model-driven tabs built is
                corroborated by that measurement. On demand rather than on load
                — it costs a second report read. */}
            {validation && (
              <div className="border-accent-foreground border-t bg-primary/5 px-4 py-2 text-foreground-dimmed text-xs">
                {translate("validation.summary", {
                  confirmed: validation.confirmed,
                  total: validation.total,
                })}
              </div>
            )}

            <div className="flex items-center justify-between border-accent-foreground border-t bg-background-dimmed px-4 py-2.5">
              <span className="text-foreground-dimmed text-xs">
                {translate("measured", { count: rivals.length })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  color="accent"
                  type="button"
                  onClick={() => handleValidate()}
                  disabled={isValidating}
                  className="h-8 px-3 font-medium text-xs"
                >
                  {isValidating
                    ? translate("action.validating")
                    : translate("action.validate")}
                </Button>
                <Button
                  color="primary"
                  type="button"
                  onClick={() => handleAdd()}
                  disabled={selected.length === 0 || isAdding}
                  className="h-8 px-4 font-medium text-xs"
                >
                  {isAdding
                    ? translate("action.adding")
                    : translate("action.add", { count: selected.length })}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
