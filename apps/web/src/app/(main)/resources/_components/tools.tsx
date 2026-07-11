import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";
import { ANONYMOUS_MESSAGE_LIMIT } from "@/server/app/intelligence/ucp/playground-limit";
import chatgpt from "@/public/images/chatgpt.svg";
import shopify from "@/public/images/shopify.svg";
import ucp from "@/public/images/ucp.svg";
import woocommerce from "@/public/images/woocommerce.svg";
import { PlaygroundArt, ScanArt, UcpArt } from "./resource-art";

type Tool = {
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

const ToolArt = ({
  art,
  highlighted,
}: {
  art: Tool["art"];
  highlighted?: boolean;
}) => {
  switch (art) {
    case "scan":
      return <ScanArt highlighted={highlighted} />;
    case "ucp":
      return <UcpArt highlighted={highlighted} />;
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

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">01</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          Free tools you can use today.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Diagnose agent readiness, validate your commerce protocol surface, and
          pressure-test a live storefront — without signing a contract.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Image src={shopify} alt="Shopify" className="h-5 w-auto opacity-80" />
          <Image
            src={woocommerce}
            alt="WooCommerce"
            className="h-5 w-auto opacity-80"
          />
          <Image src={ucp} alt="Universal Commerce Protocol" className="size-5" />
          <Image src={chatgpt} alt="ChatGPT" className="size-5 opacity-80" />
        </div>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground lg:grid-cols-3">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 lg:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 lg:flex" />
        {tools.map((tool) => (
          <article
            key={tool.title}
            className={cn(
              "flex flex-col gap-5 p-6 md:p-8",
              tool.highlighted
                ? "bg-primary text-white"
                : "bg-background-rich text-foreground",
            )}
          >
            <ToolArt art={tool.art} highlighted={tool.highlighted} />
            <p
              className={cn(
                "font-medium text-sm uppercase tracking-[0.18em]",
                tool.highlighted ? "text-white/70" : "text-foreground-dimmed",
              )}
            >
              {tool.category}
            </p>
            <div className="flex flex-1 flex-col gap-3">
              <h3 className="font-body font-medium text-2xl">{tool.title}</h3>
              <p
                className={cn(
                  "font-light leading-relaxed",
                  tool.highlighted ? "text-white/80" : "text-foreground-dimmed",
                )}
              >
                {tool.description}
              </p>
              <ul className="mt-1 flex flex-col gap-2">
                {tool.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      tool.highlighted ? "text-white/80" : "text-foreground-dimmed",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        tool.highlighted ? "bg-white/60" : "bg-primary",
                      )}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Button
              color={tool.highlighted ? "accent" : "primary"}
              className="w-full sm:w-auto"
              render={<Link href={tool.href} />}
            >
              {tool.label}
              <ArrowRightIcon className="size-4" />
            </Button>
          </article>
        ))}
      </div>
    </div>
  </section>
);
