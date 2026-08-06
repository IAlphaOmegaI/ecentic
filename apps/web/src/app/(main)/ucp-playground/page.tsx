import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { JsonLd } from "@/components/json-ld";
import { Plus } from "@/components/plus";
import { PlaygroundClient } from "@/components/ucp-playground/playground-client";
import { auth } from "@/lib/auth";
import {
  absoluteUrl,
  createBreadcrumbSchema,
  createFaqSchema,
  createMetadata,
  organizationSchema,
} from "@/lib/seo";
import Art from "@/public/images/ascii/robot.png";
import { ANONYMOUS_MESSAGE_LIMIT } from "@/server/app/intelligence/ucp/playground-limit";
import { ContentPageLayout } from "../_components/content";

const capabilities = [
  {
    title: "Catalog search & lookup",
    description:
      "Ask the agent to search a storefront's catalog or pull a single product, and inspect the exact UCP response.",
  },
  {
    title: "Cart operations",
    description:
      "Create a cart, add line items, and watch totals resolve — the same calls an AI shopping agent would make.",
  },
  {
    title: "Checkout handoff",
    description:
      "Start a checkout against the live store and confirm the continue URL an agent would hand back to the shopper.",
  },
] as const;

const description =
  "Free UCP Playground: drive a real AI shopping agent against any UCP storefront. Run catalog search, cart, and checkout over MCP or REST and inspect calls.";

const faq = [
  {
    question: "What is the UCP Playground?",
    answer:
      "A sandbox where an AI shopping agent runs live Universal Commerce Protocol operations against a storefront you choose. It resolves the store's /.well-known/ucp profile, picks its MCP or REST shopping endpoint, and shows every tool call and response.",
  },
  {
    question: "Which stores can I test?",
    answer:
      "Any storefront that publishes a valid Universal Commerce Profile at /.well-known/ucp with a dev.ucp.shopping service. The playground prefers the MCP transport and falls back to REST.",
  },
  {
    question: "Do I need an account?",
    answer: `No. Anyone can send up to ${ANONYMOUS_MESSAGE_LIMIT} messages for free. Create an account to run unlimited sessions against your own connected store.`,
  },
] as const;

export const metadata: Metadata = createMetadata({
  title: "UCP Playground — Test AI Agents on Any Storefront",
  description,
  path: "/ucp-playground",
  keywords: [
    "UCP playground",
    "Universal Commerce Protocol",
    "AI shopping agent",
    "agentic commerce sandbox",
    "MCP commerce",
    "agentic checkout",
    "free UCP tool",
  ],
});

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "UCP Playground",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/ucp-playground"),
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
  organizationSchema,
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "UCP Playground", path: "/ucp-playground" },
  ]),
  createFaqSchema(faq),
];

const PlaygroundSkeleton = () => (
  <div className="flex flex-1 items-center justify-center p-8">
    <div className="w-full max-w-md space-y-3">
      <div className="mx-auto h-4 w-40 animate-pulse bg-accent-foreground/30" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/20" />
      <div className="h-9 w-full animate-pulse bg-accent-foreground/30" />
    </div>
  </div>
);

// Streamed so the marketing shell above stays prerendered. Signed-in visitors
// land here unmetered; anonymous ones get the free-message budget the API route
// enforces per IP.
const MeteredPlayground = async () => {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <PlaygroundClient
      messageLimit={session ? undefined : ANONYMOUS_MESSAGE_LIMIT}
    />
  );
};

export default () => (
  <ContentPageLayout
    eyebrow="Universal Commerce Protocol"
    title="Point an AI shopping agent"
    accent="at any store."
    description={description}
    art={{ source: Art, alt: "ASCII-art illustration of a robot" }}
  >
    <JsonLd schemas={structuredData} />

    <section className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="relative mx-auto max-w-6xl border-accent-foreground border-x border-b">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        {/* The banner now carries the h1, so this block drops to a section
            heading rather than competing with it. */}
        <div className="relative border-accent-foreground p-6 md:p-12">
          <h2 className="font-body text-3xl text-foreground md:text-5xl">
            Watch it search, build a cart, <br />
            and check out.
          </h2>
          <p className="mt-4 max-w-xl font-light text-foreground-dimmed text-lg">
            Every tool call and response in the open. No account needed for your
            first {ANONYMOUS_MESSAGE_LIMIT} messages.
          </p>
        </div>

        <div className="relative border-accent-foreground border-t">
          <Plus className="top-0 left-0 hidden -translate-x-1/2 -translate-y-1/2 md:flex" />
          <Plus className="top-0 right-0 hidden translate-x-1/2 -translate-y-1/2 md:flex" />
          <div className="grid grid-cols-1 divide-y divide-accent-foreground md:grid-cols-3 md:divide-x md:divide-y-0">
            {capabilities.map((capability) => (
              <div
                key={capability.title}
                className="flex flex-col bg-background-rich p-6 md:p-8"
              >
                <p className="font-medium text-foreground">
                  {capability.title}
                </p>
                <p className="mt-2 font-light text-foreground-dimmed text-sm leading-relaxed">
                  {capability.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="relative -left-[calc(50vw-50%)] w-screen">
      <div className="relative mx-auto flex h-[720px] max-w-6xl border-accent-foreground border-x border-b bg-background-rich">
        <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
        <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
        <Suspense fallback={<PlaygroundSkeleton />}>
          <MeteredPlayground />
        </Suspense>
      </div>
    </section>
  </ContentPageLayout>
);
