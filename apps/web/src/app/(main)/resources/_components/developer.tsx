import { ArrowRightIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "@/components/plus";
import { seo } from "@/lib/seo";
import ucp from "@/public/images/ucp.svg";
import { LlmsArt, McpArt } from "./resource-art";

const endpoints = [
  {
    title: "llms.txt",
    description:
      "Machine-readable index of ecentic pages, tools, and blog posts for AI crawlers and agent discovery.",
    href: "/llms.txt",
    label: "View llms.txt",
    path: "/llms.txt",
    art: "llms" as const,
    highlighted: true,
  },
  {
    title: "UCP agent profile",
    description:
      "ecentic's public Universal Commerce Profile for agent discovery and protocol conformance.",
    href: "/ucp/agent-profile",
    label: "View profile",
    path: "/ucp/agent-profile",
    art: "ucp" as const,
  },
  {
    title: "MCP endpoint",
    description:
      "JSON-RPC tools surface for AI agents integrating with ecentic's hosted commerce capabilities.",
    href: "/api/mcp",
    label: "Open endpoint",
    path: "/api/mcp",
    art: "mcp" as const,
  },
  {
    title: "ecentic UCP profile",
    description:
      "The well-known discovery document served from this site for protocol inspection.",
    href: "/.well-known/ucp",
    label: "View discovery",
    path: "/.well-known/ucp",
    art: "ucp" as const,
  },
] as const;

const EndpointArt = ({
  art,
  highlighted,
}: {
  art: (typeof endpoints)[number]["art"];
  highlighted?: boolean;
}) => {
  switch (art) {
    case "llms":
      return <LlmsArt />;
    case "mcp":
      return <McpArt />;
    case "ucp":
      return (
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-4",
            highlighted
              ? "border-[#1572FA]/30 bg-[#1572FA]/10"
              : "border-[#1572FA]/20 bg-[#1572FA]/8",
          )}
        >
          <Image src={ucp} alt="Universal Commerce Protocol" className="size-10" />
          <div>
            <p className="font-medium text-foreground text-sm">
              Universal Commerce Protocol
            </p>
            <p className="font-mono text-foreground-dimmed text-xs">
              /.well-known/ucp
            </p>
          </div>
        </div>
      );
    default: {
      const exhaustive: never = art;
      return exhaustive;
    }
  }
};

export const Developer = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <div className="p-6 md:p-12">
        <span className="font-normal text-3xl text-primary">03</span>
        <h2 className="mt-2 font-body font-medium text-4xl text-foreground md:text-6xl">
          For builders and agents.
        </h2>
        <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
          Public protocol surfaces and machine-readable indexes for teams wiring
          ecentic into agent workflows.
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-2">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
        {endpoints.map((endpoint) => (
          <article
            key={endpoint.title}
            className={cn(
              "flex flex-col gap-4 p-6 md:p-8",
              endpoint.highlighted
                ? "bg-primary text-white md:col-span-2"
                : "bg-background-rich text-foreground",
            )}
          >
            <EndpointArt art={endpoint.art} highlighted={endpoint.highlighted} />
            <div className="flex flex-1 flex-col gap-3">
              <h3 className="font-body font-medium text-2xl">{endpoint.title}</h3>
              <p
                className={cn(
                  "font-light leading-relaxed",
                  endpoint.highlighted ? "text-white/80" : "text-foreground-dimmed",
                )}
              >
                {endpoint.description}
              </p>
              <p
                className={cn(
                  "font-mono text-sm",
                  endpoint.highlighted ? "text-white/70" : "text-foreground-dimmed",
                )}
              >
                {seo.host}
                {endpoint.path}
              </p>
            </div>
            <Button
              color={endpoint.highlighted ? "accent" : "primary"}
              render={<Link href={endpoint.href} />}
            >
              {endpoint.label}
              <ArrowRightIcon className="size-4" />
            </Button>
          </article>
        ))}
      </div>
    </div>
  </section>
);
