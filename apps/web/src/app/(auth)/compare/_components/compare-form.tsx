"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import { ArrowRightIcon, LoaderIcon } from "@zenncore/icons";
import { cn, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useToastManager } from "@zenncore/web/components/toast";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Spring } from "@/lib/animations";
import { formatElapsed } from "@/lib/date";
import type * as Compare from "@/server/app/intelligence/compare";
import * as Intelligence from "@/server/app/intelligence/compare";

type Phase = "input" | "running" | "results";

type LogEntry = {
  text: string;
  elapsed: number;
  type: "info" | "success" | "error";
};

const modelBarColors: Record<string, string> = {
  ChatGPT: "bg-blue-500",
  Claude: "bg-orange-500",
  Gemini: "bg-green-500",
  Perplexity: "bg-teal-500",
};

const getLogo = (label: string) => {
  switch (label) {
    case "ChatGPT":
      return "/images/chatgpt.svg";
    case "Claude":
      return "/images/claude.svg";
    case "Gemini":
      return "/images/gemini.svg";
    case "Perplexity":
      return "/images/perplexity.svg";
    default:
      return "/images/chatgpt.svg";
  }
};

export const CompareForm = () => {
  const toast = useToastManager();

  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [prompt, setPrompt] = useState("");

  const [phase, setPhase] = useState<Phase>("input");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState({ completed: 0, total: 4 });

  const [productA, setProductA] = useState<Compare.ScrapedProduct | null>(null);
  const [productB, setProductB] = useState<Compare.ScrapedProduct | null>(null);
  const [results, setResults] = useState<Compare.CompareResult[]>([]);

  const start = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const target = useRef<HTMLDivElement>(null);

  const addLog = (entry: Omit<LogEntry, "elapsed">) =>
    setLogs((previous) => [
      ...previous,
      { ...entry, elapsed: Date.now() - start.current },
    ]);

  const [handleCompare, isRunning] = useAsyncAction(async () => {
    if (!urlA || !urlB) {
      toast.add({
        title: "Missing URLs",
        description: "Please enter both product URLs.",
        type: "error",
      });
      return;
    }

    setPhase("running");
    setLogs([]);
    setResults([]);
    setProductA(null);
    setProductB(null);
    setElapsed(0);
    setProgress({ completed: 0, total: 4 });
    start.current = Date.now();

    timer.current = setInterval(() => {
      setElapsed(Date.now() - start.current);
    }, 100);

    const { output } = await unwrapResult(
      Intelligence.runCompare({
        urlA,
        urlB,
        prompt: prompt || "I want the best value for money",
      }),
    );

    for await (const event of readStreamableValue(output)) {
      if (!event) continue;

      switch (event.kind) {
        case "log":
          addLog({ text: `[${event.model}] ${event.message}`, type: "info" });
          break;
        case "chunk":
          break;
        case "scrape_done":
          setProductA(event.productA);
          setProductB(event.productB);
          addLog({
            text: "Scraped both products successfully",
            type: "success",
          });
          break;
        case "progress":
          setProgress({
            completed: event.completed,
            total: event.total,
          });
          break;
        case "error":
          addLog({ text: event.text, type: "error" });
          if (timer.current) clearInterval(timer.current);
          toast.add({
            title: "Comparison failed",
            description: event.text,
            type: "error",
          });
          return;
        case "done":
          setProductA(event.productA);
          setProductB(event.productB);
          setResults(event.results);
          setPhase("results");
          if (timer.current) clearInterval(timer.current);
          addLog({
            text: `Comparison complete — ${event.results.length} models evaluated`,
            type: "success",
          });
          break;
      }

      requestAnimationFrame(() =>
        target.current?.scrollIntoView({ behavior: "smooth" }),
      );
    }
  });

  const handleReset = () => {
    setPhase("input");
    setLogs([]);
    setResults([]);
    setProductA(null);
    setProductB(null);
    setElapsed(0);
    setProgress({ completed: 0, total: 4 });
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === "input" && (
        <motion.div
          key="input"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col"
        >
          <div className="flex-1 px-8">
            <div className="grid h-full flex-1 grid-cols-1 gap-px border-accent-foreground border-x p-6 md:grid-cols-2">
              <ProductSide
                label="Product A"
                url={urlA}
                onUrlChange={setUrlA}
                placeholder="https://amazon.com/product/..."
              />
              <ProductSide
                label="Product B"
                url={urlB}
                onUrlChange={setUrlB}
                placeholder="https://shopify.com/products/..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-accent-foreground border-t px-8">
            <div className="border-accent-foreground border-x p-6">
              <h3 className="font-medium text-2xl text-foreground">
                What matters most to you?
              </h3>
              <p className="mb-4 font-light text-foreground-dimmed text-lg">
                Tell us what you're looking for, and we'll compare the products
                based on your criteria.
              </p>
              <Textarea value={prompt} onValueChange={setPrompt}>
                <TextareaInput
                  rows={2}
                  placeholder="e.g. I want the best noise-canceling headphones under $300 with long battery life..."
                />
              </Textarea>
            </div>
          </div>
          <div className="border-accent-foreground border-t px-8">
            <div className="flex w-full items-center justify-between border-accent-foreground border-x p-6">
              <p className="font-light text-foreground-dimmed text-sm">
                We'll run the comparison across 4 AI models.
              </p>
              <Button
                color="primary"
                type="button"
                onClick={handleCompare}
                disabled={!urlA || !urlB}
              >
                {isRunning ? (
                  <>
                    Comparing...
                    <LoaderIcon className="size-4 animate-spin" />
                  </>
                ) : (
                  <>
                    Run comparison
                    <ArrowRightIcon className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {phase === "running" && (
        <motion.div
          key="running"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col"
        >
          <div className="flex items-center justify-between border-accent-foreground border-b p-4">
            <div className="flex items-center gap-2">
              <motion.span
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{
                  duration: 1.4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                className="inline-block size-1.5 rounded-full bg-primary"
              />
              <span className="font-medium text-foreground uppercase tracking-widest">
                Comparing Products
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-foreground-dimmed text-sm">
                {progress.completed}/{progress.total} models
              </span>
              <span className="font-mono text-foreground-dimmed tabular-nums">
                {formatElapsed(elapsed)}
              </span>
            </div>
          </div>

          <div className="relative h-0.5 w-full overflow-hidden bg-primary/20">
            <motion.div
              className="absolute h-full w-1/3 bg-primary"
              animate={{ x: ["-100%", "400%"] }}
              transition={{
                duration: 1.6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          </div>

          {productA && productB && (
            <div className="grid grid-cols-2 gap-px border-accent-foreground border-b bg-accent-foreground">
              <ScrapedCard product={productA} label="Product A" />
              <ScrapedCard product={productB} label="Product B" />
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto scroll-smooth p-4">
            {logs.map((log, index) => {
              const age = logs.length - 1 - index;
              const opacity = Math.max(0.2, 1 - age * 0.1);
              return (
                <motion.div
                  // biome-ignore lint/suspicious/noArrayIndexKey: sequential log entries
                  key={index}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity, x: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-baseline gap-2"
                >
                  <span className="shrink-0 font-mono text-foreground-dimmed/50 tabular-nums">
                    {formatElapsed(log.elapsed)}
                  </span>
                  <span
                    className={
                      log.type === "error"
                        ? "text-error leading-relaxed"
                        : log.type === "success"
                          ? "font-medium text-success leading-relaxed"
                          : "text-foreground-dimmed leading-relaxed"
                    }
                  >
                    {log.text}
                  </span>
                </motion.div>
              );
            })}
            <div ref={target} />
          </div>

          <div className="flex items-center gap-1.5 border-accent-foreground border-t px-5 py-3">
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
                className="inline-block size-1 rounded-full bg-primary"
              />
            ))}
            <span className="ml-1.5 font-light text-foreground-dimmed">
              Running AI comparison
            </span>
          </div>
        </motion.div>
      )}

      {phase === "results" && productA && productB && (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <CompareResults
            productA={productA}
            productB={productB}
            results={results}
            elapsed={elapsed}
            onReset={handleReset}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const ProductSide = ({
  label,
  url,
  onUrlChange,
  placeholder,
}: {
  label: string;
  url: string;
  onUrlChange: (value: string) => void;
  placeholder: string;
}) => (
  <div className="flex flex-col items-center justify-center gap-4 bg-background p-8">
    <div className="flex flex-col items-center gap-2">
      <span className="font-medium text-2xl text-foreground uppercase tracking-widest">
        {label}
      </span>
      <p className="text-center font-light text-foreground-dimmed text-lg">
        Paste a product URL from any e-commerce site
      </p>
    </div>
    <TextField
      value={url}
      onValueChange={onUrlChange}
      className="w-full max-w-md"
    >
      <TextFieldInput placeholder={placeholder} />
    </TextField>
  </div>
);

const ScrapedCard = ({
  product,
  label,
}: {
  product: Compare.ScrapedProduct;
  label: string;
}) => (
  <div className="flex items-center gap-3 bg-background-dimmed p-4">
    {product.favicon && (
      <Image
        src={product.favicon}
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0"
        unoptimized
      />
    )}
    <div className="min-w-0 flex-1">
      <p className="text-foreground-dimmed text-xs uppercase tracking-widest">
        {label}
      </p>
      <p className="truncate font-medium text-foreground text-sm">
        {product.title}
      </p>
      {product.price && (
        <p className="text-foreground-dimmed text-sm">
          {product.currency === "USD" ? "$" : product.currency} {product.price}
        </p>
      )}
    </div>
  </div>
);

const CompareResults = ({
  productA,
  productB,
  results,
  elapsed,
  onReset,
}: {
  productA: Compare.ScrapedProduct;
  productB: Compare.ScrapedProduct;
  results: Compare.CompareResult[];
  elapsed: number;
  onReset: () => void;
}) => {
  const winsA = results.filter((record) => record.winner === "a").length;
  const winsB = results.filter((record) => record.winner === "b").length;
  const totalModels = results.length;

  const percentA =
    totalModels > 0 ? Math.round((winsA / totalModels) * 100) : 0;
  const percentB =
    totalModels > 0 ? Math.round((winsB / totalModels) * 100) : 0;

  const overallWinner = winsA >= winsB ? "a" : "b";

  return (
    <>
      <div className="grid grid-cols-2 gap-px bg-accent-foreground">
        <ResultProductCard
          product={productA}
          label="Product A"
          wins={winsA}
          total={totalModels}
          isWinner={overallWinner === "a"}
        />
        <ResultProductCard
          product={productB}
          label="Product B"
          wins={winsB}
          total={totalModels}
          isWinner={overallWinner === "b"}
        />
      </div>

      <div className="border-accent-foreground border-b bg-background-dimmed p-4">
        <p className="mb-2 font-light text-foreground-dimmed uppercase tracking-widest">
          Overall Split
        </p>
        <div className="flex h-8 w-full overflow-hidden">
          <motion.div
            className="flex items-center justify-center bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percentA}%` }}
            transition={{ ...Spring.Gentle, delay: 0.3 }}
          >
            {percentA > 15 && (
              <span className="font-medium text-sm text-white">
                {percentA}%
              </span>
            )}
          </motion.div>
          <motion.div
            className="flex items-center justify-center bg-foreground-dimmed/30"
            initial={{ width: 0 }}
            animate={{ width: `${percentB}%` }}
            transition={{ ...Spring.Gentle, delay: 0.3 }}
          >
            {percentB > 15 && (
              <span className="font-medium text-foreground text-sm">
                {percentB}%
              </span>
            )}
          </motion.div>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-primary">{productA.title}</span>
          <span className="text-foreground-dimmed">{productB.title}</span>
        </div>
      </div>

      <div className="border-accent-foreground border-b bg-background-dimmed">
        <div className="p-4">
          <p className="mb-4 font-light text-foreground-dimmed uppercase tracking-widest">
            Results by Model
          </p>
        </div>

        <div className="grid grid-cols-1 gap-px bg-accent-foreground md:grid-cols-2">
          {results.map((record) => (
            <ModelResultCard
              key={record.model}
              result={record}
              productA={productA}
              productB={productB}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-accent-foreground bg-background-dimmed p-4">
        <span className="font-light text-foreground-dimmed text-sm">
          Finished in {formatElapsed(elapsed)}
        </span>
        <div className="flex items-center gap-3">
          <Button color="accent" onClick={onReset}>
            Compare again
          </Button>
          <Button color="primary" render={<Link href="/sign-up" />}>
            Start optimizing
            <ArrowRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
};

const ResultProductCard = ({
  product,
  label,
  wins,
  total,
  isWinner,
}: {
  product: Compare.ScrapedProduct;
  label: string;
  wins: number;
  total: number;
  isWinner: boolean;
}) => (
  <div
    className={cn(
      "flex flex-col gap-3 p-6",
      isWinner ? "bg-primary/5" : "bg-background-dimmed",
    )}
  >
    <div className="flex items-center gap-3">
      {product.favicon && (
        <Image
          src={product.favicon}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0"
          unoptimized
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-foreground-dimmed text-xs uppercase tracking-widest">
          {label}
        </p>
        <p className="truncate font-medium text-foreground">{product.title}</p>
      </div>
    </div>
    {product.brand && (
      <p className="text-foreground-dimmed text-sm">{product.brand}</p>
    )}
    {product.price && (
      <p className="font-medium text-foreground text-lg">
        {product.currency === "USD" ? "$" : product.currency}
        {product.price}
      </p>
    )}
    <div className="mt-auto flex items-center gap-2">
      {isWinner && (
        <span className="bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs uppercase tracking-widest">
          Winner
        </span>
      )}
      <span className="font-medium text-foreground tabular-nums">
        {wins}/{total}{" "}
        <span className="font-light text-foreground-dimmed">
          models chose this
        </span>
      </span>
    </div>
  </div>
);

const ModelResultCard = ({
  result,
  productA,
  productB,
}: {
  result: Compare.CompareResult;
  productA: Compare.ScrapedProduct;
  productB: Compare.ScrapedProduct;
}) => {
  const maxScore = Math.max(result.scoreA, result.scoreB, 1);

  return (
    <div className="flex flex-col gap-3 bg-background-dimmed p-5">
      <div className="flex items-center gap-2">
        <Image
          src={getLogo(result.modelLabel)}
          alt={result.modelLabel}
          width={20}
          height={20}
          className="size-5"
        />
        <span className="font-medium text-foreground">{result.modelLabel}</span>
        <span className="ml-auto text-foreground-dimmed text-xs uppercase tracking-widest">
          chose {result.winner === "a" ? "A" : "B"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <ScoreBar
          label={productA.title}
          score={result.scoreA}
          max={maxScore}
          isWinner={result.winner === "a"}
          colorClass={modelBarColors[result.modelLabel] ?? "bg-primary"}
          favicon={productA.favicon}
        />
        <ScoreBar
          label={productB.title}
          score={result.scoreB}
          max={maxScore}
          isWinner={result.winner === "b"}
          colorClass="bg-foreground-dimmed/50"
          favicon={productB.favicon}
        />
      </div>

      <p className="font-light text-foreground-dimmed text-sm leading-relaxed">
        {result.reasoning.slice(0, 200)}
        {result.reasoning.length > 200 && "..."}
      </p>

      {result.keyFactors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {result.keyFactors.slice(0, 3).map((factor) => (
            <span
              key={factor}
              className="bg-accent-foreground/50 px-1.5 py-0.5 text-foreground-dimmed text-xs"
            >
              {factor.slice(0, 60)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ScoreBar = ({
  label,
  score,
  max,
  isWinner,
  colorClass,
  favicon,
}: {
  label: string;
  score: number;
  max: number;
  isWinner: boolean;
  colorClass: string;
  favicon: string | null;
}) => {
  const widthPercent = max > 0 ? Math.round((score / 100) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      {favicon && (
        <Image
          src={favicon}
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0"
          unoptimized
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "truncate text-xs",
              isWinner
                ? "font-medium text-foreground"
                : "text-foreground-dimmed",
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "ml-2 shrink-0 text-xs tabular-nums",
              isWinner
                ? "font-medium text-foreground"
                : "text-foreground-dimmed",
            )}
          >
            {score}
          </span>
        </div>
        <div className="mt-0.5 h-1.5 w-full bg-accent-foreground">
          <motion.div
            className={cn(
              "h-full",
              isWinner ? colorClass : "bg-foreground-dimmed/30",
            )}
            initial={{ width: 0 }}
            animate={{ width: `${widthPercent}%` }}
            transition={{ ...Spring.Gentle, delay: 0.4 }}
          />
        </div>
      </div>
    </div>
  );
};
