"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  XIcon,
} from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import {
  Tab,
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
} from "@zenncore/web/components/tabs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { products } from "@/lib/mock-data";

const product = products[0];

const attributes = [
  {
    name: "battery_life",
    yours: null,
    competitor: "8 hours",
    status: "missing" as const,
    impact: "High — costs 34% of losses",
  },
  {
    name: "warranty",
    yours: null,
    competitor: "2 years",
    status: "missing" as const,
    impact: "High — costs 28% of losses",
  },
  {
    name: "noise_cancellation",
    yours: "yes",
    competitor: "Active, 35dB reduction",
    status: "weak" as const,
    impact: "Medium — vague vs. specific",
  },
  {
    name: "driver_size",
    yours: "12mm",
    competitor: "10mm",
    status: "strong" as const,
    impact: "Low — you win on this",
  },
  {
    name: "water_resistance",
    yours: "IPX4",
    competitor: "IPX4",
    status: "equal" as const,
    impact: "Neutral",
  },
  {
    name: "price",
    yours: "$139",
    competitor: "$129",
    status: "weak" as const,
    impact: "Medium — $10 premium",
  },
  {
    name: "shipping",
    yours: null,
    competitor: "Free 2-day",
    status: "missing" as const,
    impact: "Medium",
  },
] as const;

const replayLog = [
  {
    type: "header",
    text: "GPT-4 Decision Replay — March 5, 2026",
    model: "gpt4",
  },
  {
    type: "prompt",
    text: 'Prompt: "Buy the best wireless earbuds under $150"',
  },
  { type: "blank" },
  { type: "action", text: "→ Read product: Pro Wireless Earbuds ($139)" },
  { type: "action", text: "→ Read competitor: SoundMax X3 ($129)" },
  { type: "action", text: "→ Read competitor: BassKing Pro ($145)" },
  { type: "blank" },
  { type: "section", text: "Evaluating attributes:" },
  { type: "attr-header", text: "  battery_life:" },
  { type: "loss", text: "    Pro Wireless Earbuds = [not specified] ❌" },
  { type: "win-other", text: '    SoundMax X3 = "8 hours" ✅' },
  { type: "blank" },
  { type: "attr-header", text: "  warranty:" },
  { type: "loss", text: "    Pro Wireless Earbuds = [not specified] ❌" },
  { type: "win-other", text: '    SoundMax X3 = "2 years" ✅' },
  { type: "blank" },
  { type: "attr-header", text: "  noise_cancellation:" },
  { type: "neutral", text: '    Pro Wireless Earbuds = "yes" ✅' },
  {
    type: "win-other",
    text: '    SoundMax X3 = "Active, 35dB reduction" ✅✅',
  },
  { type: "blank" },
  { type: "decision", text: "DECISION: Selected SoundMax X3" },
  {
    type: "reasoning",
    text: 'REASONING: "SoundMax X3 offers the best combination of explicit specifications, competitive pricing, and a strong warranty. Pro Wireless Earbuds lacks battery life and warranty information, making it a riskier choice."',
  },
] as const;

const AttributeStatus = ({
  status,
}: {
  status: "missing" | "weak" | "strong" | "equal";
}) => {
  const config = (() => {
    switch (status) {
      case "missing":
        return { color: "bg-error/10 text-error", label: "Missing" };
      case "weak":
        return { color: "bg-warning/10 text-warning", label: "Weak" };
      case "strong":
        return { color: "bg-success/10 text-success", label: "Stronger" };
      case "equal":
        return { color: "bg-primary/10 text-primary", label: "Equal" };
    }
  })();

  return (
    <span className={cn("px-1.5 py-0.5 font-medium text-xs", config.color)}>
      {config.label}
    </span>
  );
};

export default () => {
  const params = useParams();
  const productId = params.id as string;
  const selectedProduct = products.find((p) => p._id === productId) ?? product;

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/dashboard/products"
          className="flex items-center gap-1 font-light text-foreground-dimmed text-sm hover:text-primary"
        >
          <ChevronLeftIcon className="size-3.5" />
          Back to Products
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center bg-primary/10 font-bold text-primary text-xl">
            {selectedProduct.title.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-medium text-foreground text-xl">
              {selectedProduct.title}
            </h1>
            <p className="font-light text-foreground-dimmed text-sm">
              {selectedProduct.category} · {selectedProduct.sku} · $
              {selectedProduct.price}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={cn(
                  "font-semibold text-2xl",
                  selectedProduct.winRate >= 60
                    ? "text-success"
                    : selectedProduct.winRate >= 30
                      ? "text-warning"
                      : "text-error",
                )}
              >
                {selectedProduct.winRate}%
              </span>
              <span className="font-light text-foreground-dimmed text-sm">
                win rate
              </span>
              <span
                className={cn(
                  "font-medium text-sm",
                  selectedProduct.winRateTrend >= 0
                    ? "text-success"
                    : "text-error",
                )}
              >
                {selectedProduct.winRateTrend >= 0 ? "↑" : "↓"}
                {Math.abs(selectedProduct.winRateTrend)}% this week
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="border border-accent-foreground bg-background-rich px-3 py-1.5 text-foreground text-sm transition-colors hover:bg-background-dimmed"
          >
            Run Simulation
          </button>
          <Link
            href="/dashboard/optimize"
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm text-white transition-colors hover:bg-primary/90"
          >
            Optimize
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4 h-auto border border-accent-foreground bg-transparent px-0">
          <TabsIndicator className="top-0 h-full translate-y-0 rounded-none" />
          <Tab value="overview">Win Rate</Tab>
          <Tab value="replay">Agent Replay</Tab>
          <Tab value="gaps">Attribute Gaps</Tab>
          <Tab value="battlecard">Battlecard</Tab>
          <Tab value="optimize">Optimize</Tab>
        </TabsList>

        <TabsPanel value="overview">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {[
              {
                model: "GPT-4",
                rate: selectedProduct.gpt4WinRate,
                wins: 41,
                losses: 59,
                total: 100,
              },
              {
                model: "Claude",
                rate: selectedProduct.claudeWinRate,
                wins: 28,
                losses: 72,
                total: 100,
              },
              {
                model: "Gemini",
                rate: selectedProduct.geminiWinRate,
                wins: 32,
                losses: 68,
                total: 100,
              },
            ].map(({ model, rate, wins, losses, total }) => (
              <div
                key={model}
                className="border border-accent-foreground bg-background-rich p-4"
              >
                <p className="mb-2 font-medium text-foreground text-sm">
                  {model}
                </p>
                <p
                  className={cn(
                    "font-semibold text-3xl",
                    rate >= 60
                      ? "text-success"
                      : rate >= 30
                        ? "text-warning"
                        : "text-error",
                  )}
                >
                  {rate}%
                </p>
                <div className="mt-2 h-1.5 w-full bg-accent-foreground">
                  <div
                    className={cn(
                      "h-full",
                      rate >= 60
                        ? "bg-success"
                        : rate >= 30
                          ? "bg-warning"
                          : "bg-error",
                    )}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <p className="mt-1 font-light text-foreground-dimmed text-xs">
                  {wins} wins · {losses} losses · {total} total
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-accent-foreground bg-background-rich p-4">
            <p className="mb-3 font-medium text-foreground text-sm">
              Win rate vs. each competitor
            </p>
            {[
              { name: "SoundMax X3", rate: 23 },
              { name: "BassKing Pro", rate: 41 },
              { name: "AudioPeak ZX1", rate: 55 },
              { name: "TechPro Buds", rate: 62 },
            ].map(({ name, rate }) => (
              <div key={name} className="mb-2 flex items-center gap-3">
                <span className="w-32 truncate font-light text-foreground-dimmed text-xs">
                  {name}
                </span>
                <div className="h-1.5 flex-1 bg-accent-foreground">
                  <div
                    className={cn(
                      "h-full",
                      rate >= 60
                        ? "bg-success"
                        : rate >= 30
                          ? "bg-warning"
                          : "bg-error",
                    )}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium text-foreground text-xs">
                  {rate}%
                </span>
              </div>
            ))}
          </div>
        </TabsPanel>

        <TabsPanel value="replay">
          <div className="border border-accent-foreground">
            <div className="flex items-center justify-between border-accent-foreground border-b bg-background-dimmed px-4 py-2">
              <p className="font-medium text-foreground text-sm">
                Agent Decision Replay
              </p>
              <select className="border-0 bg-transparent text-foreground-dimmed text-xs focus:outline-none">
                <option>March 5, 2026 — GPT-4</option>
                <option>March 5, 2026 — Claude</option>
                <option>March 5, 2026 — Gemini</option>
              </select>
            </div>
            <div className="bg-foreground p-5 font-mono text-xs leading-relaxed">
              {replayLog.map((line, index) => {
                const lineElement = (() => {
                  switch (line.type) {
                    case "header":
                      return (
                        <p className="font-bold text-white">{line.text}</p>
                      );
                    case "prompt":
                      return <p className="text-white/60">{line.text}</p>;
                    case "blank":
                      return <div className="h-2" />;
                    case "action":
                      return <p className="text-white/70">{line.text}</p>;
                    case "section":
                      return (
                        <p className="font-medium text-white">{line.text}</p>
                      );
                    case "attr-header":
                      return <p className="text-white/80">{line.text}</p>;
                    case "loss":
                      return (
                        <p className="bg-error/20 text-white">{line.text}</p>
                      );
                    case "win-other":
                      return <p className="text-white/70">{line.text}</p>;
                    case "neutral":
                      return <p className="text-white/70">{line.text}</p>;
                    case "decision":
                      return (
                        <p className="font-bold text-warning">{line.text}</p>
                      );
                    case "reasoning":
                      return (
                        <p className="mt-1 text-white/60 leading-relaxed">
                          {line.text}
                        </p>
                      );
                  }
                })();

                return (
                  // biome-ignore lint/suspicious/noArrayIndexKey: log display order matters
                  <div key={index}>{lineElement}</div>
                );
              })}
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="gaps">
          <div className="border border-accent-foreground bg-background-rich">
            <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
              <p className="font-light text-foreground-dimmed text-xs">
                Data quality:{" "}
                <span className="font-medium text-foreground">
                  {selectedProduct.dataQuality}/100
                </span>{" "}
                · Category average: 18 attributes · You have: 11
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse [&_td:first-child]:border-l-0 [&_td:last-child]:border-r-0 [&_td]:border-accent-foreground [&_td]:border-x [&_th:first-child]:border-l-0 [&_th:last-child]:border-r-0 [&_th]:border-accent-foreground [&_th]:border-x">
                <thead>
                  <tr className="border-accent-foreground border-b">
                    <th className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs">
                      Attribute
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs">
                      Your Product
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs">
                      Top Competitor
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-foreground-dimmed text-xs">
                      Impact
                    </th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {attributes.map((attribute) => (
                    <tr
                      key={attribute.name}
                      className={cn(
                        "border-accent-foreground border-b last:border-b-0",
                        attribute.status === "missing" && "bg-error/5",
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-foreground text-xs">
                        {attribute.name}
                      </td>
                      <td className="px-4 py-3">
                        {attribute.yours ? (
                          <span className="font-light text-foreground text-xs">
                            {attribute.yours}
                          </span>
                        ) : (
                          <span className="font-light text-error text-xs italic">
                            Not specified
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-light text-foreground text-xs">
                        {attribute.competitor}
                      </td>
                      <td className="px-4 py-3">
                        <AttributeStatus status={attribute.status} />
                      </td>
                      <td className="px-4 py-3 font-light text-foreground-dimmed text-xs">
                        {attribute.impact}
                      </td>
                      <td className="px-4 py-3">
                        {attribute.status !== "strong" &&
                          attribute.status !== "equal" && (
                            <button
                              type="button"
                              className="font-medium text-primary text-xs hover:underline"
                            >
                              Fix this
                            </button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="battlecard">
          <div className="border border-accent-foreground bg-background-rich">
            <div className="border-accent-foreground border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground text-sm">
                  {selectedProduct.title} vs. {selectedProduct.topCompetitor}
                </p>
                <select className="border border-accent-foreground bg-background px-2 py-1 text-foreground text-xs focus:outline-none">
                  <option>{selectedProduct.topCompetitor}</option>
                  <option>BassKing Pro</option>
                  <option>AudioPeak ZX1</option>
                </select>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-light text-foreground-dimmed text-xs">
                  Win rate against this competitor:
                </span>
                <span className="font-semibold text-error text-sm">23%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-0 divide-x divide-accent-foreground">
              <div className="p-4">
                <p className="mb-3 font-medium text-success text-xs uppercase tracking-wide">
                  You Win On
                </p>
                {[
                  "Driver size (12mm)",
                  "Brand recognition",
                  "Noise cancellation",
                ].map((item) => (
                  <div key={item} className="mb-2 flex items-center gap-2">
                    <CheckIcon className="size-3.5 text-success" />
                    <span className="font-light text-foreground text-xs">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-4">
                <p className="mb-3 font-medium text-error text-xs uppercase tracking-wide">
                  They Win On
                </p>
                {[
                  "Battery life (8hr vs. unspecified)",
                  "Warranty (2yr vs. unspecified)",
                  "Price ($129 vs. $139)",
                  "Shipping (free 2-day)",
                  "Review count",
                ].map((item) => (
                  <div key={item} className="mb-2 flex items-center gap-2">
                    <XIcon className="size-3.5 text-error" />
                    <span className="font-light text-foreground text-xs">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-accent-foreground border-t p-4">
              <p className="mb-3 font-medium text-foreground text-sm">
                Suggested counter-moves
              </p>
              {[
                { action: "Add explicit battery life to specs", lift: 15 },
                { action: "Add warranty details", lift: 12 },
                { action: "Specify noise cancellation dB rating", lift: 8 },
              ].map(({ action, lift }, index) => (
                <div
                  key={action}
                  className="mb-2 flex items-center justify-between"
                >
                  <p className="font-light text-foreground text-sm">
                    {index + 1}. {action}
                  </p>
                  <span className="bg-success/10 px-2 py-0.5 font-medium text-success text-xs">
                    +est. {lift}% lift
                  </span>
                </div>
              ))}
              <Link
                href="/dashboard/optimize"
                className="mt-3 flex w-full items-center justify-center gap-2 bg-primary py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
              >
                Apply All Suggestions
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="optimize">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border border-accent-foreground bg-background-rich">
              <div className="border-accent-foreground border-b bg-background-dimmed px-4 py-2">
                <p className="font-medium text-error text-xs">Current</p>
              </div>
              <div className="p-4">
                <p className="mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
                  Title
                </p>
                <p className="font-light text-foreground text-sm">
                  {selectedProduct.title}
                </p>
                <p className="mt-4 mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
                  Description excerpt
                </p>
                <p className="font-light text-foreground text-sm leading-relaxed">
                  High quality wireless earbuds with great sound. Comfortable
                  fit, good for everyday use. Bluetooth connectivity. Premium
                  audio experience.
                </p>
                <p className="mt-4 mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
                  Structured data
                </p>
                <p className="font-light text-error text-xs italic">
                  No JSON-LD structured data found
                </p>
              </div>
            </div>

            <div className="border border-success/30 bg-success/5">
              <div className="border-success/20 border-b bg-success/10 px-4 py-2">
                <p className="font-medium text-success text-xs">
                  Optimized · +28% estimated win rate
                </p>
              </div>
              <div className="p-4">
                <p className="mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
                  Title
                </p>
                <p className="font-light text-foreground text-sm">
                  <span className="bg-success/20 text-success">
                    Pro Wireless Earbuds — 12mm Drivers, ANC, 10hr Battery,
                    IPX4, 2-Year Warranty
                  </span>
                </p>
                <p className="mt-4 mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
                  Description excerpt
                </p>
                <p className="font-light text-foreground text-sm leading-relaxed">
                  <span className="bg-success/20 text-foreground">
                    Pro Wireless Earbuds feature 12mm premium drivers delivering
                    rich, detailed audio. Active Noise Cancellation (35dB
                    reduction) for immersive listening. 10-hour battery life
                    with IPX4 water resistance. Backed by a 2-year manufacturer
                    warranty.
                  </span>
                </p>
                <p className="mt-4 mb-1 font-medium text-foreground-dimmed text-xs uppercase tracking-wide">
                  Structured data
                </p>
                <p className="bg-success/10 p-2 font-mono text-foreground-dimmed text-xs">
                  {`{"@type":"Product","name":"Pro Wireless Earbuds","offers":{"@type":"Offer","price":"139"},...}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 bg-primary px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-primary/90"
            >
              <CheckIcon className="size-3.5" />
              Approve & Publish
            </button>
            <button
              type="button"
              className="border border-accent-foreground bg-background-rich px-4 py-2 text-foreground text-sm transition-colors hover:bg-background-dimmed"
            >
              Edit Before Publishing
            </button>
            <button
              type="button"
              className="border border-accent-foreground bg-background-rich px-4 py-2 text-foreground text-sm transition-colors hover:bg-background-dimmed"
            >
              Dismiss
            </button>
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
};
