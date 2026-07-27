import { CodeIcon } from "@zenncore/icons";
import { IndexSection } from "@/app/(main)/_components/index-section";
import { seo } from "@/lib/seo";
import { LlmsArt } from "./resource-art";

const endpoints = [
  {
    title: "llms.txt",
    mono: true,
    description:
      "Machine-readable index of ecentic pages, tools, and blog posts for AI crawlers and agent discovery.",
    meta: `${seo.host}/llms.txt`,
    action: { href: "/llms.txt", label: "Open" },
  },
  {
    title: "UCP agent profile",
    description:
      "ecentic's public Universal Commerce Profile for agent discovery and protocol conformance.",
    meta: `${seo.host}/ucp/agent-profile`,
    action: { href: "/ucp/agent-profile", label: "Open" },
  },
  {
    title: "MCP endpoint",
    description:
      "JSON-RPC tools surface for AI agents integrating with ecentic's hosted commerce capabilities.",
    meta: `${seo.host}/api/mcp`,
    action: { href: "/api/mcp", label: "Open" },
  },
  {
    title: "UCP discovery document",
    description:
      "The well-known discovery document served from this site for protocol inspection.",
    meta: `${seo.host}/.well-known/ucp`,
    action: { href: "/.well-known/ucp", label: "Open" },
  },
] as const;

const body = [
  "Everything ecentic asks merchants to publish, it publishes itself. These are the same surfaces AI agents read when they discover a store, served live from this site.",
] as const;

export const Developer = () => (
  <IndexSection
    reveal
    number="03"
    icon={CodeIcon}
    title="Inspect the public surface directly."
    description="Machine-readable indexes, discovery profiles, and tool endpoints for builders integrating agent workflows."
    body={body}
    label="Public endpoints"
    items={endpoints}
    banner={<LlmsArt />}
  />
);
