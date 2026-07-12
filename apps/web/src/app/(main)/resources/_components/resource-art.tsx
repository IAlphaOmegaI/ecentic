import { CodeIcon, FileIcon, SquareChartIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import * as motion from "motion/react-client";
import Image, { type StaticImageData } from "next/image";
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

export const ScanArt = ({ highlighted = false }: ScanArt.Props) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-lg border p-4",
      highlighted
        ? "border-white/15 bg-white/10"
        : "border-accent-foreground bg-background",
    )}
  >
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 bg-radial-[at_80%_0%]",
        highlighted
          ? "from-white/20 to-transparent"
          : "from-primary/15 to-transparent",
      )}
    />
    <div className="relative flex items-end justify-between gap-4">
      <div className="flex flex-col gap-3">
        <p
          className={cn(
            "font-medium text-xs uppercase tracking-[0.18em]",
            highlighted ? "text-white/70" : "text-foreground-dimmed",
          )}
        >
          Simulated agents
        </p>
        <ul className="flex flex-wrap gap-2">
          {agents.map((agent) => (
            <li
              key={agent.name}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs",
                highlighted
                  ? "border-white/15 bg-white/10 text-white"
                  : "border-accent-foreground bg-background-rich text-foreground",
              )}
            >
              <Image src={agent.logo} alt="" className="size-3.5" />
              {agent.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col items-end gap-2">
        <LogoTile src={shopify} alt="Shopify" />
        <LogoTile src={woocommerce} alt="WooCommerce" />
      </div>
    </div>
    <div className="relative mt-4 flex items-end gap-3">
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.2 }}
        className={cn(
          "font-bold text-5xl leading-none tracking-tight",
          highlighted ? "text-white" : "text-primary",
        )}
      >
        72
      </motion.span>
      <div className="mb-1">
        <p
          className={cn(
            "font-medium text-xs uppercase tracking-tight",
            highlighted ? "text-white/70" : "text-foreground-dimmed",
          )}
        >
          Sample / 100
        </p>
        <p
          className={cn(
            "text-sm",
            highlighted ? "text-white/80" : "text-foreground-dimmed",
          )}
        >
          AI Agent Score
        </p>
      </div>
    </div>
    <div
      className={cn(
        "relative mt-3 h-1.5 w-full overflow-hidden rounded-full",
        highlighted ? "bg-white/15" : "bg-accent-foreground",
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: "72%" }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1.1, ease: "easeOut", delay: 0.3 }}
        className={cn(
          "h-full rounded-full",
          highlighted ? "bg-white" : "bg-primary",
        )}
      />
    </div>
  </div>
);

export namespace ScanArt {
  export type Props = {
    highlighted?: boolean;
  };
}

export const UcpArt = ({ highlighted = false }: UcpArt.Props) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-lg border p-4",
      highlighted
        ? "border-white/15 bg-white/10"
        : "border-primary/25 bg-primary/5",
    )}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_0%_100%] from-primary/20 to-transparent"
    />
    <div className="relative flex items-start justify-between gap-4">
      <div className="flex flex-col gap-3">
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
              "font-medium text-sm",
              highlighted ? "text-white" : "text-foreground",
            )}
          >
            Universal Commerce Protocol
          </p>
          <p
            className={cn(
              "mt-1 font-mono text-xs",
              highlighted ? "text-white/70" : "text-foreground-dimmed",
            )}
          >
            /.well-known/ucp
          </p>
        </div>
      </div>
      <SquareChartIcon
        className={cn(
          "size-8 shrink-0",
          highlighted ? "text-white/50" : "text-primary",
        )}
      />
    </div>
    <div className="relative mt-4 grid grid-cols-3 gap-2">
      {["Discovery", "Catalog", "Checkout"].map((step, index) => (
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 26,
            delay: 0.15 + index * 0.12,
          }}
          className={cn(
            "rounded-md border px-2 py-2 text-center text-xs",
            highlighted
              ? "border-white/15 bg-white/10 text-white/80"
              : "border-primary/20 bg-background text-foreground-dimmed",
          )}
        >
          {step}
        </motion.div>
      ))}
    </div>
  </div>
);

export namespace UcpArt {
  export type Props = {
    highlighted?: boolean;
  };
}

export const PlaygroundArt = () => (
  <div className="relative overflow-hidden rounded-lg border border-accent-foreground bg-background p-4">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_100%_0%] from-primary/15 to-transparent"
    />
    <div className="relative flex items-center justify-between gap-3">
      <Image
        src={ucp}
        alt="Universal Commerce Protocol"
        className="size-10 object-contain"
      />
      <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
        Live agent loop
      </span>
    </div>
    <div className="relative mt-4 space-y-2 font-mono text-xs">
      {[
        { label: "search_catalog", tone: "text-primary" },
        { label: "create_cart", tone: "text-foreground" },
        { label: "create_checkout", tone: "text-foreground-dimmed" },
      ].map((step, index) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 26,
            delay: 0.2 + index * 0.18,
          }}
          className="flex items-center gap-2 rounded-md border border-accent-foreground bg-background-rich px-3 py-2"
        >
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{
              duration: 1.8,
              repeat: Number.POSITIVE_INFINITY,
              delay: index * 0.35,
              ease: "easeInOut",
            }}
            className="size-1.5 rounded-full bg-success"
          />
          <span className={step.tone}>{step.label}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

const llmsLines = [
  { text: "# ecentic", tone: "text-primary" },
  { text: "> AI agent commerce platform", tone: "text-foreground-dimmed" },
  { text: "", tone: "text-foreground" },
  { text: "## Core", tone: "text-success" },
  { text: "- [Scan](/sign-up)", tone: "text-foreground" },
  { text: "- [UCP Validator](/ucp-validator)", tone: "text-foreground" },
  { text: "- [Blog](/blog)", tone: "text-foreground-dimmed" },
] as const;

export const LlmsArt = () => (
  <div className="relative overflow-hidden rounded-lg border border-accent-foreground bg-background-rich p-4">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_0%_0%] from-success/10 to-transparent"
    />
    <div className="relative mb-3 flex items-center gap-2">
      {["bg-error/80", "bg-warning/80", "bg-success/80"].map((tone, index) => (
        <motion.span
          key={tone}
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
            delay: index * 0.08,
          }}
          className={cn("size-2.5 rounded-full", tone)}
        />
      ))}
      <span className="ml-2 font-mono text-foreground-dimmed text-xs">
        llms.txt
      </span>
    </div>
    <pre className="relative overflow-hidden rounded-md border border-accent-foreground bg-background p-3 font-mono text-[11px] leading-relaxed">
      {llmsLines.map((line, index) => (
        <motion.span
          // biome-ignore lint/suspicious/noArrayIndexKey: static line list, order never changes
          key={index}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.25, delay: 0.3 + index * 0.15 }}
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
        className="mt-0.5 inline-block h-3 w-1.5 bg-foreground-dimmed"
      />
    </pre>
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
