"use client";

import { BullseyeIcon, CopyIcon, LoaderIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  field,
  type GenericForm,
  InferredForm,
} from "@zenncore/web/components/inferred-form";
import { useToastManager } from "@zenncore/web/components/toast";
import { useMemo, useState } from "react";
import { z } from "zod";
import * as CatalogRank from "@/server/app/intelligence/catalog-rank";
import { StatusPill } from "../../../_components/grid";

const COUNTRIES = ["US", "GB", "DE", "FR", "IT", "ES", "NL", "CA"] as const;

export const FeedUrlCard = ({ url }: { url: string }) => {
  const toast = useToastManager();

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 truncate font-mono text-foreground-dimmed text-xs">
        {url}
      </p>
      <Button
        color="primary"
        className="shrink-0 gap-1.5"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          toast.add({
            title: "Feed URL copied",
            description:
              "Paste it into Google Merchant Center (scheduled fetch) and the Perplexity Merchant Program.",
            type: "success",
          });
        }}
      >
        <CopyIcon className="size-4" />
        Copy feed URL
      </Button>
    </div>
  );
};

export const RankChecker = ({
  store,
  configured,
}: {
  store: string;
  configured: boolean;
}) => {
  const toast = useToastManager();
  const [measurement, setMeasurement] =
    useState<CatalogRank.RankMeasurement | null>(null);

  const [handleSubmit, isChecking] = useAsyncAction(
    async (data: { query: string; country: (typeof COUNTRIES)[number] }) => {
      const result = await CatalogRank.measureCatalogRank({
        store,
        query: data.query,
        country: data.country,
      });

      if (!result.success) {
        toast.add({
          title: "Rank check failed",
          description: result.error.message,
          type: "error",
        });
        return;
      }

      setMeasurement(result.data);
    },
  );

  const config = useMemo(
    () =>
      ({
        query: field({
          shape: "text",
          validator: z.string().min(2, "Enter a buyer query"),
          label: "Buyer query",
          placeholder: "e.g. waterproof trail running shoes",
          classList: { field: "flex-1" },
        }),
        country: field({
          shape: "select",
          validator: z.enum(COUNTRIES),
          label: "Market",
        }),
      }) satisfies GenericForm,
    [],
  );

  if (!configured) {
    return (
      <div className="flex flex-col gap-2 bg-background-rich p-5">
        <p className="font-medium text-base text-foreground-rich">
          Global Catalog credentials missing
        </p>
        <p className="max-w-xl text-foreground-dimmed text-sm">
          Set SHOPIFY_CATALOG_CLIENT_ID and SHOPIFY_CATALOG_CLIENT_SECRET (Dev
          Dashboard → Catalogs → Get an API key) to measure where this store
          ranks in the retrieval index AI shopping agents query.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-accent-foreground border-b p-4">
        <InferredForm
          config={config}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
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
            Check rank
          </Button>
        </InferredForm>
      </div>

      {measurement && (
        <div className="flex flex-col">
          <div className="flex flex-wrap items-baseline gap-3 border-accent-foreground border-b bg-background-dimmed px-4 py-3">
            <p className="font-bold text-2xl text-foreground-rich tabular-nums">
              {measurement.rank === null ? "Not found" : `#${measurement.rank}`}
            </p>
            <p className="text-foreground-dimmed text-sm">
              {measurement.rank === null
                ? `this store did not appear in the top ${measurement.totalReturned} live results for "${measurement.query}"`
                : `of ${measurement.totalReturned} live results for "${measurement.query}"`}
            </p>
          </div>

          <div className="divide-y divide-accent-foreground">
            {measurement.offers.map((offer) => (
              <div
                key={offer.position}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
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
                      className="block truncate font-medium text-foreground text-sm hover:text-primary"
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
                {offer.mine && <StatusPill tone="primary">You</StatusPill>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
