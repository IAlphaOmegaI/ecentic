"use client";

import { LoaderIcon, ShieldCheckIcon } from "@zenncore/icons";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { useEffect, useState } from "react";
import * as Demo from "@/server/app/intelligence/claim-check-demo";
import type * as Rules from "@/server/app/intelligence/claim-check-rules";
import { Band } from "../../../dashboard/_components/grid";
import {
  ClaimsReport,
  ProductBand,
} from "../../../dashboard/[store]/products/[id]/claims/_components/report";
import { ReportSkeleton } from "../../../dashboard/[store]/products/[id]/claims/_components/shell";

/** Products that have public product data, for a demo with no prep. */
const EXAMPLES = [
  "https://www.allbirds.com/products/mens-tree-runners",
  "https://www.tentree.com/products/w-tencel-pacific-jogger",
];

type Result = {
  platform: "shopify" | "woocommerce";
  report: Rules.Report;
  checkedAt: Date;
};

/** m:ss since `since`, ticking while a run is in flight. */
const Elapsed = ({ since }: { since: number }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <span className="font-mono tabular-nums">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
    </span>
  );
};

/**
 * Paste a product URL, run the real check, show the dashboard's own report.
 * The run is one server action that waits for the whole check, so the result
 * lives in this component: a refresh clears it rather than paying for another
 * run.
 */
export const ClaimCheckDemo = () => {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setError(null);
    setResult(null);
    setStartedAt(Date.now());
    const response = await Demo.runDemoClaimCheck({ url });
    setStartedAt(null);

    if (!response.success) {
      setError(response.error.message);
      return;
    }
    setResult({ ...response.data, checkedAt: new Date() });
  });

  return (
    <>
      <Band>
        <form
          className="flex flex-col gap-3 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (url.trim() && !isRunning) handleRun();
          }}
        >
          <span className="text-foreground text-sm">Product page URL</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <TextField
              value={url}
              onValueChange={setUrl}
              className="min-w-0 flex-1"
            >
              <TextFieldInput
                placeholder="https://store.com/products/handle"
                className="font-mono"
              />
            </TextField>
            <Button
              type="submit"
              color="primary"
              className="shrink-0 gap-1.5"
              disabled={isRunning || !url.trim()}
            >
              {isRunning ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <ShieldCheckIcon className="size-4" />
              )}
              Run claim check
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-foreground-dimmed text-xs">
            <span>Try:</span>
            {EXAMPLES.map((example) => (
              <Button
                key={example}
                type="button"
                variant="ghost"
                className="h-auto px-1.5 py-0.5 font-mono text-xs"
                disabled={isRunning}
                onClick={() => setUrl(example)}
              >
                {new URL(example).hostname.replace(/^www\./, "")}
              </Button>
            ))}
          </div>
        </form>
      </Band>

      {startedAt !== null && (
        <>
          <Band
            surface={false}
            className="flex items-center gap-3 bg-primary/5 px-6 py-4"
          >
            <LoaderIcon className="size-4 shrink-0 animate-spin text-primary" />
            <div>
              <p className="font-medium text-foreground text-sm">
                Checking claims… <Elapsed since={startedAt} />
              </p>
              <p className="mt-0.5 text-foreground-dimmed text-xs">
                Reading the live page, asking ChatGPT, Claude and Gemini,
                researching each claim with Perplexity and opening the pages it
                cites. Usually one to two minutes.
              </p>
            </div>
          </Band>
          <ReportSkeleton />
        </>
      )}

      {error && (
        <Band surface={false} className="bg-warning/5 px-6 py-4">
          <p className="font-medium text-sm text-warning">
            The check didn't run
          </p>
          <p className="mt-1 text-foreground-dimmed text-xs">{error}</p>
        </Band>
      )}

      {result && (
        <>
          <ProductBand
            product={{
              title: result.report.listing.title,
              url: result.report.listing.url,
            }}
            checkedAt={result.checkedAt}
            listingChanged={false}
          />
          <ClaimsReport report={result.report} />
        </>
      )}
    </>
  );
};
