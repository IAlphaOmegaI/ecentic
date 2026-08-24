import { seo } from "@/lib/seo";

/**
 * Recovery entry points offered on a 404, in the order worth trying.
 *
 * Shared by the HTML page and the Markdown document at `/404.md` so the two can
 * never disagree — a recovery link that exists in one and not the other sends
 * half the callers somewhere the other half cannot go.
 */
export const RECOVERY_LINKS = [
  {
    href: "/",
    label: "Homepage",
    description: "What ecentic does, and who it is for.",
  },
  {
    href: "/docs",
    label: "Developer documentation",
    description: "API reference, authentication, errors, MCP, and webhooks.",
  },
  {
    href: "/sitemap.xml",
    label: "Sitemap",
    description: "Every indexable page, in both locales.",
  },
  {
    href: "/llms.txt",
    label: "llms.txt",
    description: "The site map written for language models.",
  },
  {
    href: "/.well-known/api-catalog",
    label: "API catalog",
    description: "RFC 9727 linkset of every machine-facing surface.",
  },
  {
    href: "/openapi.json",
    label: "OpenAPI document",
    description: "Typed request and response schemas for the public API.",
  },
] as const;

/** The `/404.md` document, and the block embedded in the HTML 404. */
export const notFoundMarkdown = () =>
  [
    "# 404 — Not found",
    "",
    "The requested path does not exist on ecentic.ai. Try one of these instead:",
    "",
    ...RECOVERY_LINKS.map(
      (link) =>
        `- [${link.label}](${seo.host}${link.href}) — ${link.description}`,
    ),
    "",
    "API paths under `/api` answer with RFC 9457 `application/problem+json`, carrying a machine-readable `code` and a `resolution` hint. See " +
      `${seo.host}/docs/errors.`,
    "",
  ].join("\n");
