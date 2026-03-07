"use client";

import { CheckIcon, XIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { cn } from "@zenncore/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Method = "auto" | "url" | "search";

const detectedCompetitors = [
  { _id: "c1", brand: "SoundMax", product: "SoundMax X3", price: 129, source: "Amazon", selected: true },
  { _id: "c2", brand: "SoundMax", product: "SoundMax X3 Pro", price: 159, source: "Amazon", selected: true },
  { _id: "c3", brand: "BassKing", product: "BassKing Pro", price: 145, source: "Direct", selected: true },
  { _id: "c4", brand: "BassKing", product: "BassKing Lite", price: 89, source: "Amazon", selected: false },
  { _id: "c5", brand: "AudioPeak", product: "AudioPeak ZX1", price: 119, source: "Shopify", selected: true },
  { _id: "c6", brand: "TechPro", product: "TechPro Buds", price: 134, source: "Amazon", selected: false },
] as const;

export default () => {
  const router = useRouter();
  const [activeMethod, setActiveMethod] = useState<Method>("auto");
  const [detected, setDetected] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  const handleAutoDetect = () => {
    setIsDetecting(true);
    setTimeout(() => {
      setIsDetecting(false);
      setDetected(true);
      setSelectedCompetitors(
        new Set(detectedCompetitors.filter((c) => c.selected).map((c) => c._id)),
      );
    }, 1200);
  };

  const toggleCompetitor = (id: string) => {
    setSelectedCompetitors((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="font-medium text-2xl text-foreground">
            Who are your competitors?
          </h1>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            We'll test your products head-to-head against these competitors in AI
            agent simulations.
          </p>
        </div>

        <div className="mb-4 flex gap-0 border border-accent-foreground">
          {(["auto", "url", "search"] as const).map((method) => {
            const label = (() => {
              switch (method) {
                case "auto":
                  return "Auto-detect";
                case "url":
                  return "Paste URLs";
                case "search":
                  return "Search Brand";
              }
            })();

            return (
              <button
                key={method}
                type="button"
                onClick={() => setActiveMethod(method)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-medium transition-colors border-r border-accent-foreground last:border-r-0",
                  activeMethod === method
                    ? "bg-primary text-white"
                    : "bg-background-rich text-foreground-dimmed hover:bg-background-dimmed",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {activeMethod === "auto" && (
          <div className="border border-accent-foreground bg-background-rich">
            {!detected ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="font-light text-foreground-dimmed text-sm">
                  We'll scan your product categories and price ranges to find the
                  most relevant competitors.
                </p>
                <Button
                  variant="flat"
                  color="primary"
                  type="button"
                  onClick={handleAutoDetect}
                  disabled={isDetecting}
                  className="px-6 py-2 font-medium text-sm"
                >
                  {isDetecting ? "Detecting..." : "Auto-detect competitors"}
                </Button>
              </div>
            ) : (
              <div>
                <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                  <p className="text-foreground-dimmed text-xs">
                    Found {detectedCompetitors.length} competitor products across{" "}
                    {new Set(detectedCompetitors.map((c) => c.brand)).size} brands —{" "}
                    {selectedCompetitors.size} selected
                  </p>
                </div>
                {detectedCompetitors.map((competitor) => (
                  <button
                    key={competitor._id}
                    type="button"
                    onClick={() => toggleCompetitor(competitor._id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-accent-foreground border-b px-4 py-3 text-left transition-colors last:border-b-0",
                      selectedCompetitors.has(competitor._id)
                        ? "bg-primary/5"
                        : "hover:bg-background-dimmed/50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center border",
                        selectedCompetitors.has(competitor._id)
                          ? "border-primary bg-primary"
                          : "border-accent-foreground bg-background-rich",
                      )}
                    >
                      {selectedCompetitors.has(competitor._id) && (
                        <CheckIcon className="size-2.5 text-white" />
                      )}
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10 font-semibold text-primary text-xs">
                          {competitor.product.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {competitor.product}
                          </p>
                          <p className="text-foreground-dimmed text-xs">
                            {competitor.brand} · {competitor.source}
                          </p>
                        </div>
                      </div>
                      <p className="font-light text-foreground text-sm">
                        ${competitor.price}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeMethod === "url" && (
          <div className="border border-accent-foreground bg-background-rich p-4">
            <label
              htmlFor="competitorUrls"
              className="mb-2 block text-xs font-medium text-foreground"
            >
              Paste competitor product URLs (one per line)
            </label>
            <textarea
              id="competitorUrls"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              rows={6}
              placeholder={`https://amazon.com/dp/B0XXXXX\nhttps://competitorstore.com/products/example\nhttps://amazon.com/dp/B0YYYYY`}
              className="w-full border border-accent-foreground bg-background px-3 py-2 font-mono text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
            />
            <Button
              variant="flat"
              color="primary"
              type="button"
              disabled={!urlInput.trim()}
              className="mt-3 px-4 py-2 text-sm font-medium"
            >
              Extract Product Data
            </Button>
          </div>
        )}

        {activeMethod === "search" && (
          <div className="border border-accent-foreground bg-background-rich p-4">
            <label
              htmlFor="brandSearch"
              className="mb-2 block text-xs font-medium text-foreground"
            >
              Search by brand or category
            </label>
            <input
              id="brandSearch"
              type="text"
              placeholder="e.g. SoundMax, wireless earbuds under $150..."
              className="w-full border border-accent-foreground bg-background px-3 py-2 text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {["Wireless Earbuds", "Travel Mugs", "Yoga Equipment", "Kitchen Appliances"].map((category) => (
                <button
                  key={category}
                  type="button"
                  className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground-dimmed text-xs transition-colors hover:border-primary hover:text-primary"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            color="neutral"
            type="button"
            className="text-foreground-dimmed text-sm"
            render={<Link href="/onboarding/select-products" />}
          >
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              color="neutral"
              type="button"
              render={<Link href="/onboarding/first-scan" />}
              className="text-foreground-dimmed text-sm"
            >
              Skip — auto-match
            </Button>
            <Button
              variant="flat"
              color="primary"
              type="button"
              render={<Link href="/onboarding/first-scan" />}
              className="px-6 py-2 text-sm font-medium"
            >
              Next: Run Scan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
