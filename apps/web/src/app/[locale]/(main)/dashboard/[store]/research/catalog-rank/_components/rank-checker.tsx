"use client";

import { BullseyeIcon, LoaderIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { z } from "zod";
import { CommerceFigure } from "@/components/marketing/commerce-figure";
import { Link } from "@/i18n/navigation";
import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { StatusPill } from "../../../../_components/grid";

const COUNTRIES = ["US", "GB", "DE", "FR", "IT", "ES", "NL", "CA"] as const;

export const RankChecker = ({
  store,
  configured,
}: {
  store: string;
  configured: boolean;
}) => {
  const translate = useTranslations("dashboard.visibility.rankChecker");
  const research = useTranslations("dashboard.research");
  const format = useFormatter();
  const [checked, setChecked] = useState<{ country: string; at: Date } | null>(
    null,
  );
  const toast = useToastManager();
  const [measurement, setMeasurement] =
    useState<CatalogRank.RankMeasurement | null>(null);

  const [handleSubmit, isChecking] = useAsyncAction(
    async (data: { query: string; country: (typeof COUNTRIES)[number] }) => {
      const response = await resultify(() =>
        CatalogRank.measureCatalogRank({
          store,
          query: data.query,
          country: data.country,
        }),
      );

      if (!response.success || !response.data.success) {
        toast.add({
          title: translate("toast.failed"),
          description: research("unavailable.description"),
          type: "error",
        });
        return;
      }

      setMeasurement(response.data.data);
      setChecked({ country: data.country, at: new Date() });
    },
  );

  const config = useMemo(
    () =>
      ({
        query: field({
          shape: "text",
          validator: z.string().min(2, translate("fields.query.validation")),
          label: translate("fields.query.label"),
          placeholder: translate("fields.query.placeholder"),
          classList: { field: "min-w-0 flex-1" },
        }),
        country: field({
          shape: "select",
          validator: z.enum(COUNTRIES),
          label: translate("fields.country.label"),
        }),
      }) satisfies GenericForm,
    [translate],
  );

  if (!configured) {
    return (
      <div className="flex min-h-64 flex-col items-start justify-center gap-3 border-accent-foreground border-b px-4 py-8 sm:px-6">
        <h2 className="font-semibold text-foreground-rich text-xl">
          {research("rank.unavailable.title")}
        </h2>
        <p className="max-w-xl text-foreground-dimmed text-sm leading-6">
          {research("rank.unavailable.description")}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button
            variant="soft"
            color="neutral"
            render={<Link href={`/dashboard/${store}/visibility`} />}
          >
            {research("rank.unavailable.action.primary")}
          </Button>
          <Button
            variant="soft"
            color="neutral"
            render={<Link href={`/dashboard/${store}/research`} />}
          >
            {research("rank.unavailable.action.secondary")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-accent-foreground border-b px-4 py-5 sm:px-6">
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
        >
          <Button
            type="submit"
            color="primary"
            className="shrink-0 gap-1.5"
            disabled={isChecking}
          >
            {isChecking ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <BullseyeIcon className="size-4" />
            )}
            {translate("action.primary")}
          </Button>
        </InferredForm>
      </div>

      {!measurement && (
        <div className="grid min-h-64 items-center md:grid-cols-3">
          <div className="px-4 py-8 sm:px-6 md:col-span-2">
            <h2 className="font-semibold text-xl">
              {research("rank.empty.title")}
            </h2>
            <p className="mt-3 max-w-xl text-foreground-dimmed text-sm leading-6">
              {research("rank.empty.description")}
            </p>
          </div>
          <div className="mx-auto w-full max-w-64 px-6 pb-6 md:py-6">
            <CommerceFigure kind="shopifyBag" className="h-44" />
          </div>
        </div>
      )}
      {measurement && (
        <div className="flex flex-col">
          <div className="flex flex-wrap items-baseline gap-3 border-accent-foreground border-b bg-primary/5 px-4 py-4 sm:px-6">
            <p className="font-bold text-2xl text-foreground-rich tabular-nums">
              {measurement.rank === null
                ? translate("notFound")
                : `#${measurement.rank}`}
            </p>
            <p className="text-foreground-dimmed text-sm">
              {measurement.rank === null
                ? translate("resultNotFound", {
                    total: String(measurement.totalReturned),
                    query: measurement.query,
                  })
                : translate("resultFound", {
                    total: String(measurement.totalReturned),
                    query: measurement.query,
                  })}
            </p>
          </div>

          {checked && (
            <p className="border-accent-foreground border-b px-4 py-3 text-foreground-dimmed text-xs leading-5 sm:px-6">
              {research("rank.checked", {
                country: checked.country,
                time: format.dateTime(checked.at, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          )}
          <div className="divide-y divide-accent-foreground">
            {measurement.offers.map((offer) => (
              <div
                key={offer.position}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 sm:px-6",
                  offer.mine && "bg-primary/5",
                )}
              >
                <span className="w-8 shrink-0 text-right font-semibold text-foreground-dimmed text-sm tabular-nums">
                  {offer.position}
                </span>
                <div className="min-w-0 flex-1">
                  {offer.url ? (
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium text-foreground text-sm hover:text-primary-text"
                    >
                      {offer.title}
                    </a>
                  ) : (
                    <p className="truncate font-medium text-foreground text-sm">
                      {offer.title}
                    </p>
                  )}
                  <p className="truncate text-foreground-dimmed text-xs">
                    {[offer.seller, offer.price, offer.rating]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {offer.mine && (
                  <StatusPill tone="primary">{translate("you")}</StatusPill>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
