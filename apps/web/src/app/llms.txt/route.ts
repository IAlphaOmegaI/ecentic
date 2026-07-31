import { unwrapResult } from "@zenncore/utils";
import { seo } from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";

const prefersMarkdown = (accept: string | null) =>
  accept != null && /\btext\/markdown\b/i.test(accept);

/** Rough token estimate used by Markdown-for-Agents (`x-markdown-tokens`). */
const estimateMarkdownTokens = (markdown: string) =>
  Math.max(1, Math.ceil(markdown.length / 4));

export const GET = async (request: Request) => {
  const posts = await unwrapResult(Blog.listPublished(Environment.SERVER));

  const sections = [
    {
      title: "Core",
      description: "Product intent, pricing, and the landing story.",
      links: [
        { path: "/", label: "ecentic — Win Every AI Shopping Agent's Cart" },
        { path: "/sign-up", label: "Create an ecentic account" },
        { path: "/sign-in", label: "Sign in to ecentic" },
      ],
    },
    {
      title: "Features",
      description:
        "What ecentic does: AI simulation, diagnosis, and product listing optimization.",
      links: [
        { path: "/features", label: "AI ecommerce tools for merchants" },
        {
          path: "/features/product-listings",
          label: "AI product listing optimization",
        },
      ],
    },
    {
      title: "Platforms",
      description: "How ecentic connects to the underlying commerce stack.",
      links: [
        { path: "/platforms/shopify", label: "AI for Shopify stores" },
        { path: "/platforms/woocommerce", label: "AI for WooCommerce stores" },
      ],
    },
    {
      title: "Research",
      description:
        "Category comparisons and tooling for teams evaluating the space.",
      links: [
        { path: "/resources", label: "Free tools and resources" },
        {
          path: "/compare/best-ai-ecommerce-tools",
          label: "Best AI tools for ecommerce — buyer's guide",
        },
        {
          path: "/ucp-validator",
          label: "Universal Commerce Protocol (UCP) validator",
        },
        {
          path: "/ucp-playground",
          label: "UCP Playground — test AI shopping agents",
        },
      ],
    },
    {
      title: "Policies",
      description: "Legal and data handling.",
      links: [{ path: "/privacy-policy", label: "Privacy Policy" }],
    },
    {
      title: "Agent API",
      description: "Machine-facing endpoints for AI agent integrations.",
      links: [
        { path: "/api/mcp", label: "MCP endpoint (JSON-RPC tools)" },
        { path: "/ucp/agent-profile", label: "UCP agent profile" },
        {
          path: "/auth.md",
          label: "auth.md — agent registration and credentials",
        },
        {
          path: "/.well-known/oauth-protected-resource",
          label: "OAuth Protected Resource Metadata (RFC 9728)",
        },
        {
          path: "/.well-known/oauth-authorization-server",
          label: "OAuth Authorization Server Metadata (RFC 8414)",
        },
        {
          path: "/.well-known/mcp/server-card.json",
          label: "MCP Server Card (SEP-1649)",
        },
      ],
    },

    {
      title: "Blog",
      description:
        "Long-form guides on structured data, agent traffic, and catalog visibility.",
      links: [
        { path: "/blog", label: "ecentic blog — index" },
        ...posts.map((post) => ({
          path: `/blog/${post.slug}`,
          label: post.title,
        })),
      ],
    },
  ];

  const preamble = [
    `# ${seo.name}`,
    "",
    `> ${seo.description}`,
    "",
    "ecentic simulates how AI shopping agents — ChatGPT, Claude, Gemini, Perplexity — evaluate product listings against competitors, diagnoses why a product wins or loses, and auto-optimizes catalog content so merchants capture agent-driven commerce.",
    "",
    `- Site: ${seo.host}`,
    `- Sitemap: ${seo.host}/sitemap.xml`,
    `- robots.txt (Content Signals): ${seo.host}/robots.txt`,
    `- API catalog: ${seo.host}/.well-known/api-catalog`,
    `- OAuth discovery: ${seo.host}/.well-known/oauth-authorization-server`,
    `- OpenID configuration: ${seo.host}/.well-known/openid-configuration`,
    `- UCP profile: ${seo.host}/.well-known/ucp`,
    `- ACP discovery: ${seo.host}/.well-known/acp.json`,
    `- OpenAPI (MPP): ${seo.host}/openapi.json`,
    `- x402 payable API root: ${seo.host}/api (HTTP 402 + PAYMENT-REQUIRED)`,
    `- MCP endpoint: ${seo.host}/api/mcp`,
    `- Agent skills: ${seo.host}/.well-known/agent-skills/index.json`,
    `- auth.md: ${seo.host}/auth.md`,
    `- OAuth Protected Resource: ${seo.host}/.well-known/oauth-protected-resource`,
    `- MCP Server Card: ${seo.host}/.well-known/mcp/server-card.json`,
    "",
  ].join("\n");

  const body = sections
    .map(
      (section) =>
        `## ${section.title}\n\n${section.description}\n\n${section.links
          .map((link) => `- [${link.label}](${seo.host}${link.path})`)
          .join("\n")}`,
    )
    .join("\n\n");

  const markdown = `${preamble}\n${body}\n`;
  const asMarkdown = prefersMarkdown(request.headers.get("accept"));

  return new Response(markdown, {
    headers: {
      // Direct `/llms.txt` stays text/plain (llmstxt.org); Accept negotiation
      // (including proxy rewrite from `/`) returns text/markdown for agents.
      "Content-Type": asMarkdown
        ? "text/markdown; charset=utf-8"
        : "text/plain; charset=utf-8",
      Vary: "Accept",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      ...(asMarkdown
        ? { "x-markdown-tokens": String(estimateMarkdownTokens(markdown)) }
        : {}),
    },
  });
};
