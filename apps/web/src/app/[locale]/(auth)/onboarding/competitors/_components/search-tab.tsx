"use client";

import { SearchIcon, XIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useOnboardingError } from "@/app/[locale]/(auth)/onboarding/_components/use-onboarding-error";
import { callOnboardingAction } from "@/lib/onboarding-errors";
import type * as Competitor from "@/server/app/competitor";
import * as Search from "@/server/app/intelligence/search";
import { CompetitorResults, ErrorNotice } from "./competitor-results";

export namespace SearchTab {
  export type Props = {
    onSuccess?: (competitors: Competitor.Type[]) => void;
    productNames: string[];
    store: string;
    className?: string;
    /** Compact, flush presentation inside the store dashboard. */
    dashboard?: boolean;
  };
}

export const SearchTab = ({
  onSuccess,
  productNames,
  store,
  className,
  dashboard = false,
}: SearchTab.Props) => {
  const toast = useToastManager();
  const formatError = useOnboardingError();
  const translate = useTranslations("onboarding.competitors.search");
  const [query, setQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor.Type[]>([]);

  const [handleSearch, isSearching] = useAsyncAction(
    async (manual?: string) => {
      const term = manual ?? query;
      if (!term?.trim()) return;

      setError(null);

      const result = await callOnboardingAction(() =>
        Search.searchCompetitors({ query: term, store }),
      );

      if (!result.success) {
        // Inline as well as in a toast — a search that returns nothing is the
        // one case where the user needs the reason to change their query.
        setError(formatError(result.error));
        toast.add({
          title: translate("toast.failed"),
          description: formatError(result.error),
          type: "error",
        });
        return;
      }

      setCompetitors((previous) => [...previous, ...result.data]);
      onSuccess?.(result.data);
      setQuery(null);
      toast.add({
        title: translate("toast.found.title"),
        description: translate("toast.found.description", {
          count: String(result.data.length),
        }),
        type: "success",
      });
    },
  );

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden",
        dashboard && "h-auto min-h-64 bg-background-rich",
        className,
      )}
    >
      <div
        className={cn(
          "relative border-accent-foreground border-b bg-background-dimmed p-4",
          dashboard && "bg-background-rich py-6 sm:px-6",
        )}
      >
        {!dashboard && (
          <Image
            src="/images/websearch.png"
            alt=""
            aria-hidden
            fill
            className="pointer-events-none select-none object-contain opacity-10"
          />
        )}
        <div className="relative z-10">
          <label
            htmlFor="brandSearch"
            className="mb-2 block font-medium text-foreground text-sm"
          >
            {translate("label")}
          </label>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <TextField
              value={query}
              onValueChange={setQuery}
              className="min-h-10 min-w-0 bg-background-rich px-3 sm:flex-1"
            >
              <SearchIcon className="size-4 shrink-0 text-foreground-dimmed" />
              <TextFieldInput
                id="brandSearch"
                placeholder={translate("placeholder")}
                className="text-sm placeholder:text-foreground-dimmed/70"
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch();
                }}
              />
              {query && (
                <Button
                  variant="ghost"
                  color="neutral"
                  type="button"
                  aria-label={translate("clearAria")}
                  onClick={() => setQuery(null)}
                  className="shrink-0 text-foreground-dimmed transition-colors hover:text-foreground"
                >
                  <XIcon className="size-4" />
                </Button>
              )}
            </TextField>
            <Button
              color="primary"
              type="button"
              onClick={() => handleSearch()}
              disabled={!query?.trim() || isSearching}
              className="h-10 shrink-0 px-5 font-medium text-sm"
            >
              {isSearching
                ? translate("action.searching")
                : translate("action.search")}
            </Button>
          </div>

          {error && (
            <div className="mt-3">
              <ErrorNotice title={translate("toast.failed")} message={error} />
            </div>
          )}

          {productNames.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <span className="text-foreground-dimmed text-xs">
                {translate("productHint")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {productNames.map((name) => (
                  <Button
                    variant="soft"
                    color="neutral"
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => handleSearch(name)}
                    disabled={isSearching}
                    className="h-auto max-w-full justify-start truncate px-3 py-1.5 text-xs sm:max-w-64"
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {competitors.length === 0 && !isSearching && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 items-center justify-center p-8"
          >
            <p className="text-center text-foreground-dimmed text-sm">
              {translate("empty")}
            </p>
          </motion.div>
        )}

        {competitors.length === 0 && isSearching && (
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

        {competitors.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <CompetitorResults
              dashboard={dashboard}
              competitors={competitors}
              noun="competitor"
              verb="found"
              onClear={() => setCompetitors([])}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
