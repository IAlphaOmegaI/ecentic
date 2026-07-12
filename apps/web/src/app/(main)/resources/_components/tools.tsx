import { ArrowRightIcon, CheckIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";
import { ANONYMOUS_MESSAGE_LIMIT } from "@/server/app/intelligence/ucp/playground-limit";
import { PlaygroundArt, ScanArt, UcpArt } from "./resource-art";
import { Reveal, RevealItem } from "./reveal";

type Tool = {
  number: string;
  category: string;
  title: string;
  description: string;
  features: readonly string[];
  href: string;
  label: string;
  highlighted?: boolean;
  art: "scan" | "ucp" | "playground";
};

const tools: readonly Tool[] = [
  {
    number: "Tool 01",
    category: "Win-rate simulation",
    title: "AI Agent Score Scan",
    description:
      "Run a one-time simulation of your top 10 products across GPT-4, Claude, Gemini, and Perplexity. See where you win, where you lose, and what to fix first.",
    features: [
      "Top 10 products",
      "Four model perspectives",
      "Results in about two minutes",
    ],
    href: "/sign-up",
    label: "Scan your store free",
    highlighted: true,
    art: "scan",
  },
  {
    number: "Tool 02",
    category: "Protocol check",
    title: "UCP Validator",
    description:
      "Check whether a storefront publishes a valid Universal Commerce Profile at /.well-known/ucp and whether major shopping agents are allowed in robots.txt.",
    features: [
      "Endpoint reachability",
      "Schema validation",
      "Agent access review",
    ],
    href: "/ucp-validator",
    label: "Validate a store",
    art: "ucp",
  },
  {
    number: "Tool 03",
    category: "Agent sandbox",
    title: "UCP Playground",
    description:
      "Drive a real AI shopping agent against any UCP-compliant storefront. Search catalogs, build carts, start checkout, and inspect every tool call.",
    features: [
      "Catalog search and lookup",
      "Cart operations",
      `${ANONYMOUS_MESSAGE_LIMIT} free messages without an account`,
    ],
    href: "/ucp-playground",
    label: "Open playground",
    art: "playground",
  },
] as const;

const ToolArt = ({ art }: { art: Tool["art"] }) => {
  switch (art) {
    case "scan":
      return <ScanArt />;
    case "ucp":
      return <UcpArt />;
    case "playground":
      return <PlaygroundArt />;
    default: {
      const exhaustive: never = art;
      return exhaustive;
    }
  }
};

export const Tools = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">01</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            Three free tools, three questions answered.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            Measure selection, check protocol readiness, or watch a live agent
            work through a storefront. No credit card for any of them.
          </p>
        </RevealItem>
      </Reveal>

      <div className="relative flex flex-col gap-px border-accent-foreground border-t bg-accent-foreground">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {tools.map((tool, index) => {
          const reversed = index % 2 === 1;

          return (
            <Reveal
              key={tool.title}
              className="grid grid-cols-1 gap-px md:grid-cols-2"
            >
              <div
                className={cn(
                  "flex items-center bg-background-dimmed p-6 md:p-10",
                  reversed && "md:order-2",
                )}
              >
                <RevealItem className="mx-auto w-full max-w-md">
                  <ToolArt art={tool.art} />
                </RevealItem>
              </div>
              <div
                className={cn(
                  "p-6 md:p-10",
                  tool.highlighted
                    ? "bg-primary text-white"
                    : "bg-background-rich text-foreground",
                  reversed && "md:order-1",
                )}
              >
                <RevealItem className="flex h-full flex-col gap-3">
                  <p
                    className={cn(
                      "font-medium text-sm uppercase tracking-[0.18em]",
                      tool.highlighted ? "text-white/70" : "text-primary",
                    )}
                  >
                    {tool.number} · {tool.category}
                  </p>
                  <h3 className="mt-1 font-body font-medium text-3xl md:text-4xl">
                    {tool.title}
                  </h3>
                  <p
                    className={cn(
                      "font-light text-lg leading-relaxed",
                      tool.highlighted
                        ? "text-white/80"
                        : "text-foreground-dimmed",
                    )}
                  >
                    {tool.description}
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {tool.features.map((feature) => (
                      <li
                        key={feature}
                        className={cn(
                          "flex items-center gap-2",
                          tool.highlighted
                            ? "text-white/80"
                            : "text-foreground-dimmed",
                        )}
                      >
                        <CheckIcon
                          className={cn(
                            "size-4 shrink-0",
                            tool.highlighted ? "text-white/70" : "text-primary",
                          )}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    color={tool.highlighted ? "accent" : "primary"}
                    className="mt-6 w-fit md:mt-auto"
                    render={<Link href={tool.href} />}
                  >
                    {tool.label}
                    <ArrowRightIcon className="size-4" />
                  </Button>
                </RevealItem>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  </section>
);
