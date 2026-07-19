import { ArrowRightIcon, CodeIcon } from "@zenncore/icons";
import { cn } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Link from "next/link";
import { Plus } from "@/components/plus";
import { Reveal, RevealItem } from "@/components/reveal";
import { seo } from "@/lib/seo";
import { LlmsArt } from "./resource-art";

const endpoints = [
  {
    title: "llms.txt",
    description:
      "Machine-readable index of ecentic pages, tools, and blog posts for AI crawlers and agent discovery.",
    href: "/llms.txt",
    path: "/llms.txt",
  },
  {
    title: "UCP agent profile",
    description:
      "ecentic's public Universal Commerce Profile for agent discovery and protocol conformance.",
    href: "/ucp/agent-profile",
    path: "/ucp/agent-profile",
  },
  {
    title: "MCP endpoint",
    description:
      "JSON-RPC tools surface for AI agents integrating with ecentic's hosted commerce capabilities.",
    href: "/api/mcp",
    path: "/api/mcp",
  },
  {
    title: "UCP discovery document",
    description:
      "The well-known discovery document served from this site for protocol inspection.",
    href: "/.well-known/ucp",
    path: "/.well-known/ucp",
  },
] as const;

export const Developer = () => (
  <section className="border-accent-foreground border-b">
    <div className="relative mx-auto max-w-6xl border-accent-foreground border-x">
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

      <Reveal className="p-6 md:p-12">
        <RevealItem>
          <span className="font-normal text-3xl text-primary">03</span>
        </RevealItem>
        <RevealItem>
          <h2 className="mt-2 max-w-3xl text-balance font-body font-medium text-4xl text-foreground md:text-6xl">
            Inspect the public surface directly.
          </h2>
        </RevealItem>
        <RevealItem>
          <p className="mt-4 max-w-2xl font-light text-foreground-dimmed text-xl">
            Machine-readable indexes, discovery profiles, and tool endpoints for
            builders integrating agent workflows.
          </p>
        </RevealItem>
      </Reveal>

      <Reveal className="relative grid grid-cols-1 gap-px border-accent-foreground border-t bg-accent-foreground md:grid-cols-[5fr_8fr]">
        <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
        <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />

        <div className="flex flex-col bg-background-dimmed md:min-h-0">
          <RevealItem className="flex flex-col gap-6 p-6 md:p-8">
            <CodeIcon className="size-8 text-primary" />
            <p className="font-body font-light text-foreground-dimmed text-lg leading-relaxed">
              Everything ecentic asks merchants to publish, it publishes itself.
              These are the same surfaces AI agents read when they discover a
              store, served live from this site.
            </p>
          </RevealItem>
          <LlmsArt />
        </div>

        <div className="flex flex-col gap-px bg-accent-foreground">
          <p className="bg-background-rich px-6 pt-6 pb-4 font-medium text-primary text-sm md:px-8">
            Public endpoints
          </p>
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.path}
              className="flex flex-1 bg-background-rich px-6 py-5 md:px-8"
            >
              <RevealItem className="flex h-full w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col gap-1">
                  <h3
                    className={cn(
                      "font-medium text-foreground text-xl",
                      /[./]/.test(endpoint.title) && "font-mono",
                    )}
                  >
                    {endpoint.title}
                  </h3>
                  <p className="font-light text-foreground-dimmed leading-relaxed">
                    {endpoint.description}
                  </p>
                  <p className="mt-1 font-mono text-foreground-dimmed text-xs">
                    {seo.host}
                    {endpoint.path}
                  </p>
                </div>
                <Button
                  color="accent"
                  className="w-fit shrink-0 self-end sm:self-auto"
                  render={<Link href={endpoint.href} />}
                >
                  Open
                  <ArrowRightIcon className="size-4" />
                </Button>
              </RevealItem>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);
