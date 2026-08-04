import { CodeIcon, FileIcon, SquareChartIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import Image, { type StaticImageData } from "next/image";
import chatgpt from "@/public/images/chatgpt.svg";
import claude from "@/public/images/claude.svg";
import gemini from "@/public/images/gemini.svg";
import perplexity from "@/public/images/perplexity.svg";
import shopify from "@/public/images/shopify.svg";
import ucp from "@/public/images/ucp.svg";
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
  <span className="flex size-10 items-center justify-center rounded-xl border border-accent-foreground bg-background p-2 shadow-sm">
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
      "relative overflow-hidden rounded-2xl border p-4",
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
      <span
        className={cn(
          "font-bold text-5xl leading-none tracking-tight",
          highlighted ? "text-white" : "text-primary",
        )}
      >
        72
      </span>
      <div className="mb-1">
        <p
          className={cn(
            "font-medium text-xs uppercase tracking-tight",
            highlighted ? "text-white/70" : "text-foreground-dimmed",
          )}
        >
          / 100
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
      <div
        className={cn(
          "h-full w-[72%] rounded-full",
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
      "relative overflow-hidden rounded-2xl border p-4",
      highlighted
        ? "border-white/15 bg-white/10"
        : "border-[#1572FA]/25 bg-[#1572FA]/8",
    )}
  >
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_0%_100%] from-[#1572FA]/20 to-transparent"
    />
    <div className="relative flex items-start justify-between gap-4">
      <div className="flex flex-col gap-3">
        <Image
          src={ucp}
          alt="Universal Commerce Protocol"
          className="size-12"
        />
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
          highlighted ? "text-white/50" : "text-[#1572FA]",
        )}
      />
    </div>
    <div className="relative mt-4 grid grid-cols-3 gap-2">
      {["Discovery", "Catalog", "Checkout"].map((step) => (
        <div
          key={step}
          className={cn(
            "rounded-lg border px-2 py-2 text-center text-xs",
            highlighted
              ? "border-white/15 bg-white/10 text-white/80"
              : "border-[#1572FA]/20 bg-background text-foreground-dimmed",
          )}
        >
          {step}
        </div>
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
  <div className="relative overflow-hidden rounded-2xl border border-accent-foreground bg-background p-4">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_100%_0%] from-primary/15 to-transparent"
    />
    <div className="relative flex items-center justify-between gap-3">
      <Image src={ucp} alt="Universal Commerce Protocol" className="size-10" />
      <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary text-xs">
        Live agent loop
      </span>
    </div>
    <div className="relative mt-4 space-y-2 font-mono text-xs">
      {[
        { label: "search_catalog", tone: "text-primary" },
        { label: "create_cart", tone: "text-foreground" },
        { label: "create_checkout", tone: "text-foreground-dimmed" },
      ].map((step) => (
        <div
          key={step.label}
          className="flex items-center gap-2 rounded-lg border border-accent-foreground bg-background-rich px-3 py-2"
        >
          <span className="size-1.5 rounded-full bg-success" />
          <span className={step.tone}>{step.label}</span>
        </div>
      ))}
    </div>
  </div>
);

export const LlmsArt = () => (
  <div className="relative overflow-hidden rounded-2xl border border-accent-foreground bg-background-rich p-4">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_0%_0%] from-success/10 to-transparent"
    />
    <div className="relative mb-3 flex items-center gap-2">
      <span className="size-2.5 rounded-full bg-red-400/80" />
      <span className="size-2.5 rounded-full bg-yellow-400/80" />
      <span className="size-2.5 rounded-full bg-green-400/80" />
      <span className="ml-2 font-mono text-foreground-dimmed text-xs">
        llms.txt
      </span>
    </div>
    <pre className="relative overflow-hidden rounded-xl border border-accent-foreground bg-background p-3 font-mono text-[11px] leading-relaxed">
      <span className="text-primary"># ecentic</span>
      {"\n"}
      <span className="text-foreground-dimmed">
        {"> AI agent commerce platform"}
      </span>
      {"\n\n"}
      <span className="text-success">## Core</span>
      {"\n"}
      <span className="text-foreground">- [Scan](/sign-up)</span>
      {"\n"}
      <span className="text-foreground">- [UCP Validator](/ucp-validator)</span>
      {"\n"}
      <span className="text-foreground-dimmed">- [Blog](/blog)</span>
    </pre>
  </div>
);

export const McpArt = () => (
  <div className="relative overflow-hidden rounded-2xl border border-accent-foreground bg-background p-4">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-radial-[at_100%_100%] from-primary/12 to-transparent"
    />
    <div className="relative flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl border border-accent-foreground bg-background-rich">
        <CodeIcon className="size-5 text-primary" />
      </span>
      <div>
        <p className="font-medium text-foreground text-sm">JSON-RPC tools</p>
        <p className="font-mono text-foreground-dimmed text-xs">/api/mcp</p>
      </div>
    </div>
    <pre className="relative mt-4 overflow-hidden rounded-xl border border-accent-foreground bg-background-rich p-3 font-mono text-[11px] text-foreground-dimmed leading-relaxed">
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
              className="rounded-xl border border-accent-foreground bg-background px-3 py-4 text-center font-medium text-foreground-dimmed text-xs"
            >
              {label}
            </div>
          ))}
        </div>
      );
    case "blog":
      return (
        <div className="flex items-center gap-3 rounded-2xl border border-accent-foreground bg-background-rich p-4">
          <span className="flex size-10 items-center justify-center rounded-xl border border-accent-foreground bg-background">
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
        <div className="flex items-center gap-3 rounded-2xl border border-[#95BF47]/30 bg-[#95BF47]/10 p-4">
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
        <div className="flex items-center gap-3 rounded-2xl border border-[#7F54B3]/30 bg-[#7F54B3]/10 p-4">
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
