"use client";

import { CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Motion } from "@/components/motion";
import { Scale, Spring, Stagger } from "@/lib/animations";

type Method = "auto" | "url" | "search";

const detectedCompetitors = [
  {
    _id: "c1",
    brand: "SoundMax",
    product: "SoundMax X3",
    price: 129,
    source: "Amazon",
    selected: true,
  },
  {
    _id: "c2",
    brand: "SoundMax",
    product: "SoundMax X3 Pro",
    price: 159,
    source: "Amazon",
    selected: true,
  },
  {
    _id: "c3",
    brand: "BassKing",
    product: "BassKing Pro",
    price: 145,
    source: "Direct",
    selected: true,
  },
  {
    _id: "c4",
    brand: "BassKing",
    product: "BassKing Lite",
    price: 89,
    source: "Amazon",
    selected: false,
  },
  {
    _id: "c5",
    brand: "AudioPeak",
    product: "AudioPeak ZX1",
    price: 119,
    source: "Shopify",
    selected: true,
  },
  {
    _id: "c6",
    brand: "TechPro",
    product: "TechPro Buds",
    price: 134,
    source: "Amazon",
    selected: false,
  },
] as const;

export default () => {
  const [activeMethod, setActiveMethod] = useState<Method>("auto");
  const [detected, setDetected] = useState(false);
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(
    new Set(),
  );
  const [urlInput, setUrlInput] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  const handleAutoDetect = () => {
    setIsDetecting(true);
    setTimeout(() => {
      setIsDetecting(false);
      setDetected(true);
      setSelectedCompetitors(
        new Set(
          detectedCompetitors.filter((c) => c.selected).map((c) => c._id),
        ),
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
    <Motion.Stagger stagger={0.05} className="flex flex-1 flex-col px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Motion.Up className="mb-6">
          <h1 className="font-medium text-2xl text-foreground">
            Who are your competitors?
          </h1>
          <p className="mt-1 font-light text-foreground-dimmed text-sm">
            We'll test your products head-to-head against these competitors in
            AI agent simulations.
          </p>
        </Motion.Up>

        <Motion.Up className="relative mb-4 flex gap-0 border border-accent-foreground">
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
                  "relative flex-1 border-accent-foreground border-r py-2.5 font-medium text-sm transition-colors last:border-r-0",
                  activeMethod === method
                    ? "text-white"
                    : "bg-background-rich text-foreground-dimmed hover:bg-background-dimmed",
                )}
              >
                {activeMethod === method && (
                  <motion.div
                    layoutId="competitor-tab-indicator"
                    className="absolute inset-0 bg-primary"
                    transition={Spring.Snappy}
                  />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </Motion.Up>

        <AnimatePresence mode="wait">
          {activeMethod === "auto" && (
            <motion.div
              key="auto"
              className="border border-accent-foreground bg-background-rich"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={Spring.Snappy}
            >
              {!detected ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="font-light text-foreground-dimmed text-sm">
                    We'll scan your product categories and price ranges to find
                    the most relevant competitors.
                  </p>
                  <motion.div
                    animate={
                      isDetecting
                        ? { scale: [1, 1.03, 1], opacity: [1, 0.75, 1] }
                        : {}
                    }
                    transition={
                      isDetecting
                        ? { repeat: Number.POSITIVE_INFINITY, duration: 0.9 }
                        : {}
                    }
                  >
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
                  </motion.div>
                </div>
              ) : (
                <div>
                  <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                    <p className="text-foreground-dimmed text-xs">
                      Found {detectedCompetitors.length} competitor products
                      across{" "}
                      {new Set(detectedCompetitors.map((c) => c.brand)).size}{" "}
                      brands — {selectedCompetitors.size} selected
                    </p>
                  </div>
                  <div>
                    {detectedCompetitors.map((competitor, index) => (
                      <motion.button
                        key={competitor._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 320,
                          damping: 28,
                          delay: index * 0.06,
                        }}
                        type="button"
                        onClick={() => toggleCompetitor(competitor._id)}
                        className={cn(
                          "flex w-full items-center gap-3 border-accent-foreground border-b px-4 py-3 text-left transition-colors last:border-b-0",
                          selectedCompetitors.has(competitor._id)
                            ? "bg-primary/5"
                            : "hover:bg-background-dimmed/50",
                        )}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div
                          className={cn(
                            "flex size-4 shrink-0 items-center justify-center border transition-colors duration-150",
                            selectedCompetitors.has(competitor._id)
                              ? "border-primary bg-primary"
                              : "border-accent-foreground bg-background-rich",
                          )}
                        >
                          <CheckIcon
                            className={cn(
                              "size-2.5 text-white transition-opacity duration-150",
                              selectedCompetitors.has(competitor._id)
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
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
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeMethod === "url" && (
            <motion.div
              key="url"
              className="border border-accent-foreground bg-background-rich p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={Spring.Snappy}
            >
              <label
                htmlFor="competitorUrls"
                className="mb-2 block font-medium text-foreground text-xs"
              >
                Paste competitor product URLs (one per line)
              </label>
              <textarea
                id="competitorUrls"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                rows={6}
                placeholder={
                  "https://amazon.com/dp/B0XXXXX\nhttps://competitorstore.com/products/example\nhttps://amazon.com/dp/B0YYYYY"
                }
                className="w-full border border-accent-foreground bg-background px-3 py-2 font-mono text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
              />
              <Motion.Tap whileHover={{ y: -1 }} transition={Spring.Snappy}>
                <Button
                  variant="flat"
                  color="primary"
                  type="button"
                  disabled={!urlInput.trim()}
                  className="mt-3 px-4 py-2 font-medium text-sm"
                >
                  Extract Product Data
                </Button>
              </Motion.Tap>
            </motion.div>
          )}

          {activeMethod === "search" && (
            <motion.div
              key="search"
              className="border border-accent-foreground bg-background-rich p-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={Spring.Snappy}
            >
              <label
                htmlFor="brandSearch"
                className="mb-2 block font-medium text-foreground text-xs"
              >
                Search by brand or category
              </label>
              <input
                id="brandSearch"
                type="text"
                placeholder="e.g. SoundMax, wireless earbuds under $150..."
                className="w-full border border-accent-foreground bg-background px-3 py-2 text-foreground text-sm placeholder:text-foreground-dimmed focus:border-primary focus:outline-none"
              />
              <motion.div
                className="mt-4 flex flex-wrap gap-2"
                variants={Stagger.Container(0.06)}
                initial="hidden"
                animate="visible"
              >
                {[
                  "Wireless Earbuds",
                  "Travel Mugs",
                  "Yoga Equipment",
                  "Kitchen Appliances",
                ].map((category) => (
                  <motion.button
                    key={category}
                    variants={Scale.In}
                    type="button"
                    className="border border-accent-foreground bg-background px-3 py-1.5 text-foreground-dimmed text-xs transition-colors hover:border-primary hover:text-primary"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={Spring.Snappy}
                  >
                    {category}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <Motion.Up className="mt-6 flex items-center justify-between">
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
            <Motion.Tap whileHover={{ y: -1 }} transition={Spring.Snappy}>
              <Button
                variant="flat"
                color="primary"
                type="button"
                render={<Link href="/onboarding/first-scan" />}
                className="px-6 py-2 font-medium text-sm"
              >
                Next: Run Scan
              </Button>
            </Motion.Tap>
          </div>
        </Motion.Up>
      </div>
    </Motion.Stagger>
  );
};
