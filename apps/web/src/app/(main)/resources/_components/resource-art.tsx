import { CodeIcon, FileIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import * as motion from "motion/react-client";
import Image, { type StaticImageData } from "next/image";
import Background from "@/public/images/background.webp";
import chatgpt from "@/public/images/chatgpt.svg";
import claude from "@/public/images/claude.svg";
import gemini from "@/public/images/gemini.svg";
import perplexity from "@/public/images/perplexity.svg";
import shopify from "@/public/images/shopify.svg";
import ucp from "@/public/images/ucp.png";
import woocommerce from "@/public/images/woocommerce.svg";

const agents = [
  { name: "ChatGPT", logo: chatgpt },
  { name: "Claude", logo: claude },
  { name: "Gemini", logo: gemini },
  { name: "Perplexity", logo: perplexity },
] as const;

const LogoTile = ({
  src,
  alt,
  className,
}: {
  src: StaticImageData | string;
  alt: string;
  className?: string;
}) => (
  <span className="flex size-10 items-center justify-center rounded-md border border-accent-foreground bg-background p-2">
    <Image
      src={src}
      alt={alt}
      className={cn("size-5 object-contain", className)}
    />
  </span>
);

const agentScores = [
  { name: "ChatGPT", logo: chatgpt, score: 78, bar: "bg-emerald-500" },
  { name: "Claude", logo: claude, score: 71, bar: "bg-orange-400" },
  { name: "Gemini", logo: gemini, score: 69, bar: "bg-blue-500" },
  { name: "Perplexity", logo: perplexity, score: 74, bar: "bg-purple-500" },
] as const;

export const ScanArt = ({ highlighted = false, className }: ScanArt.Props) => (
  <div
    className={cn(
      "relative h-full min-h-64 w-full overflow-hidden bg-background-dimmed",
      className,
    )}
  >
    <Image
      src={Background}
      alt=""
      aria-hidden
      fill
      sizes="(max-width: 768px) 100vw, 400px"
      className={cn(
        "pointer-events-none select-none object-contain object-top",
        highlighted ? "opacity-25 invert" : "opacity-35 invert",
      )}
    />
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 bg-radial-[at_50%_15%]",
        highlighted
          ? "from-white/5 to-transparent"
          : "from-primary/5 to-transparent",
      )}
    />
    <div className="relative flex h-full min-h-64 flex-col justify-center gap-6 px-6 py-8">
      <div className="text-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.85 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 20,
            delay: 0.1,
          }}
          className={cn(
            "font-bold text-8xl leading-none tracking-tight md:text-9xl",
            highlighted ? "text-white" : "text-primary",
          )}
        >
          72
        </motion.span>
        <p
          className={cn(
            "mt-2 font-medium text-sm",
            highlighted ? "text-white/80" : "text-foreground-dimmed",
          )}
        >
          AI Agent Score
        </p>
        <p
          className={cn(
            "text-xs",
            highlighted ? "text-white/60" : "text-foreground-dimmed",
          )}
        >
          out of 100
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {agentScores.map((agent, index) => (
          <li key={agent.name} className="flex items-center gap-3">
            <Image src={agent.logo} alt="" className="size-5 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "truncate font-medium text-xs",
                    highlighted ? "text-white/90" : "text-foreground",
                  )}
                >
                  {agent.name}
                </span>
                <span
                  className={cn(
                    "shrink-0 font-semibold text-xs tabular-nums",
                    highlighted ? "text-white" : "text-primary",
                  )}
                >
                  {agent.score}%
                </span>
              </div>
              <div
                className={cn(
                  "h-1.5 w-full overflow-hidden rounded-full",
                  highlighted ? "bg-white/15" : "bg-accent-foreground",
                )}
              >
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${agent.score}%` }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.9,
                    ease: [0.22, 1, 0.36, 1],
                    delay: 0.25 + index * 0.1,
                  }}
                  className={cn("h-full rounded-full", agent.bar)}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export namespace ScanArt {
  export type Props = {
    highlighted?: boolean;
    className?: string;
  };
}

const ucpCapabilities = [
  "dev.ucp.shopping.catalog.search",
  "dev.ucp.shopping.catalog.lookup",
  "dev.ucp.shopping.cart",
  "dev.ucp.shopping.checkout",
  "dev.ucp.shopping.fulfillment",
  "dev.ucp.shopping.discount",
  "dev.ucp.shopping.order",
] as const;

export const UcpArt = ({ highlighted = false, className }: UcpArt.Props) => (
  <div
    className={cn(
      "relative flex h-full min-h-64 w-full flex-col justify-center overflow-hidden bg-primary/5 p-6 md:p-8",
      className,
    )}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_0%_100%] from-primary/20 to-transparent"
    />
    <div className="relative flex flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 320, damping: 22 }}
        className="w-fit"
      >
        <Image
          src={ucp}
          alt="Universal Commerce Protocol"
          className="size-12 object-contain"
        />
      </motion.div>
      <div>
        <p
          className={cn(
            "font-medium text-lg md:text-xl",
            highlighted ? "text-white" : "text-foreground",
          )}
        >
          Universal Commerce Protocol
        </p>
        <p
          className={cn(
            "mt-1.5 font-mono text-sm md:text-base",
            highlighted ? "text-white/70" : "text-foreground-dimmed",
          )}
        >
          /.well-known/ucp
        </p>
      </div>
    </div>
    <div className="relative mt-6 font-mono text-sm leading-relaxed md:text-base">
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className={cn(highlighted ? "text-success" : "text-primary")}
      >
        "capabilities":
      </motion.p>
      {ucpCapabilities.map((capability, index) => (
        <motion.p
          key={capability}
          initial={{ opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            duration: 0.25,
            delay: 0.15 + index * 0.06,
          }}
          className="pl-3"
        >
          <span
            className={highlighted ? "text-white/40" : "text-foreground-dimmed"}
          >
            -{" "}
          </span>
          <span className={highlighted ? "text-white/85" : "text-foreground"}>
            {capability}
          </span>
        </motion.p>
      ))}
    </div>
  </div>
);

export namespace UcpArt {
  export type Props = {
    highlighted?: boolean;
    className?: string;
  };
}

export { PlaygroundArt } from "./playground-art-loop";

const llmsLines = [
  { text: "# ecentic", tone: "text-primary" },
  { text: "> AI agent commerce platform", tone: "text-white/50" },
  { text: "", tone: "text-white" },
  { text: "## Core", tone: "text-success" },
  { text: "- [Scan](/sign-up)", tone: "text-white/85" },
  { text: "- [UCP Validator](/ucp-validator)", tone: "text-white/85" },
  { text: "- [Blog](/blog)", tone: "text-white/50" },
] as const;

export const LlmsArt = () => (
  <div className="relative flex flex-1 flex-col">
    <div className="relative -mt-16 flex flex-1 flex-col bg-[#191919] pt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-112 bg-linear-to-b from-background-dimmed to-background-dimmed/0"
      />
      <p className="relative z-20 px-6 pb-4 font-mono text-sm md:px-8">
        <span className="animate-[gold-shine_3s_linear_infinite] bg-linear-to-r bg-size-[200%_auto] from-primary via-white to-primary bg-clip-text text-transparent">
          llms.txt
        </span>
        <motion.span
          aria-hidden
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: 1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          className="ml-0.5 inline-block h-4 w-1.5 translate-y-px bg-white/50"
        />
      </p>
      <div className="relative z-20 flex-1 px-6 pb-5 md:px-8 md:pb-6">
        <pre className="font-mono text-sm leading-relaxed md:text-base">
          {llmsLines.map((line, index) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: static line list, order never changes
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.25, delay: 0.15 + index * 0.12 }}
              className={cn("block", line.tone)}
            >
              {line.text || " "}
            </motion.span>
          ))}
          <motion.span
            aria-hidden
            animate={{ opacity: [1, 0, 1] }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
            className="mt-1 inline-block h-4 w-1.5 bg-[#191919]/50"
          />
        </pre>
      </div>
    </div>
  </div>
);

export const McpArt = () => (
  <div className="relative overflow-hidden rounded-lg border border-accent-foreground bg-background p-4">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_100%_100%] from-primary/12 to-transparent"
    />
    <div className="relative flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-md border border-accent-foreground bg-background-rich">
        <CodeIcon className="size-5 text-primary" />
      </span>
      <div>
        <p className="font-medium text-foreground text-sm">JSON-RPC tools</p>
        <p className="font-mono text-foreground-dimmed text-xs">/api/mcp</p>
      </div>
    </div>
    <pre className="relative mt-4 overflow-hidden rounded-md border border-accent-foreground bg-background-rich p-3 font-mono text-[11px] text-foreground-dimmed leading-relaxed">
      {`{\n  "jsonrpc": "2.0",\n  "method": "tools/list"\n}`}
    </pre>
  </div>
);

export const GuideArt = ({ kind }: GuideArt.Props) => {
  switch (kind) {
    case "how-it-works":
      return (
        <div className="flex items-center gap-2">
          {agents.slice(0, 3).map((agent) => (
            <LogoTile key={agent.name} src={agent.logo} alt={agent.name} />
          ))}
        </div>
      );
    case "compare":
      return (
        <div className="grid grid-cols-3 gap-2">
          {["Content", "Search", "Agents"].map((label) => (
            <div
              key={label}
              className="rounded-md border border-accent-foreground bg-background px-3 py-4 text-center font-medium text-foreground-dimmed text-xs"
            >
              {label}
            </div>
          ))}
        </div>
      );
    case "blog":
      return (
        <div className="flex items-center gap-3 rounded-lg border border-accent-foreground bg-background-rich p-4">
          <span className="flex size-10 items-center justify-center rounded-md border border-accent-foreground bg-background">
            <FileIcon className="size-5 text-primary" />
          </span>
          <div>
            <p className="font-medium text-foreground text-sm">
              Long-form guides
            </p>
            <p className="text-foreground-dimmed text-xs">
              Structured data, agent traffic, catalog visibility
            </p>
          </div>
        </div>
      );
    case "shopify":
      return (
        <div className="flex items-center gap-3 rounded-lg border border-accent-foreground bg-background p-4">
          <Image src={shopify} alt="Shopify" className="size-8" />
          <div>
            <p className="font-medium text-foreground text-sm">
              Built for Shopify
            </p>
            <p className="text-foreground-dimmed text-xs">
              Install, scan, and publish back via Admin API
            </p>
          </div>
        </div>
      );
    case "woocommerce":
      return (
        <div className="flex items-center gap-3 rounded-lg border border-accent-foreground bg-background p-4">
          <Image src={woocommerce} alt="WooCommerce" className="h-7 w-auto" />
          <div>
            <p className="font-medium text-foreground text-sm">
              Built for WooCommerce
            </p>
            <p className="text-foreground-dimmed text-xs">
              Connect REST keys and publish approved updates
            </p>
          </div>
        </div>
      );
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
};

export namespace GuideArt {
  export type Kind =
    | "how-it-works"
    | "compare"
    | "blog"
    | "shopify"
    | "woocommerce";

  export type Props = {
    kind: Kind;
  };
}
