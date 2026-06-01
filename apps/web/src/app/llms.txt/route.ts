import { unwrapResult } from "@zenncore/utils";
import { seo } from "@/lib/seo";
import * as Blog from "@/server/app/blog";
import { Environment } from "@/server/utils/environment";

export const GET = async () => {
  const posts = await unwrapResult(Blog.listPublished(Environment.SERVER));

  const sections = [
    {
      title: "Core",
      description: "Product intent, pricing, and the landing story.",
      links: [
        { path: "/", label: "écentic — Win Every AI Shopping Agent's Cart" },
        { path: "/sign-up", label: "Create an écentic account" },
        { path: "/sign-in", label: "Sign in to écentic" },
      ],
    },
    {
      title: "Features",
      description:
        "What écentic does: AI simulation, diagnosis, and product listing optimization.",
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
      description: "How écentic connects to the underlying commerce stack.",
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
        {
          path: "/compare/best-ai-ecommerce-tools",
          label: "Best AI tools for ecommerce — buyer's guide",
        },
        {
          path: "/ucp-validator",
          label: "Universal Commerce Protocol (UCP) validator",
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
      ],
    },

    {
      title: "Blog",
      description:
        "Long-form guides on structured data, agent traffic, and catalog visibility.",
      links: [
        { path: "/blog", label: "écentic blog — index" },
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
    "écentic simulates how AI shopping agents — GPT-4, Claude, Gemini, Perplexity — evaluate product listings against competitors, diagnoses why a product wins or loses, and auto-optimizes catalog content so merchants capture agent-driven commerce.",
    "",
    `- Site: ${seo.host}`,
    `- Sitemap: ${seo.host}/sitemap.xml`,
    `- UCP profile: ${seo.host}/.well-known/ucp`,
    `- MCP endpoint: ${seo.host}/api/mcp`,
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

  return new Response(`${preamble}\n${body}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
