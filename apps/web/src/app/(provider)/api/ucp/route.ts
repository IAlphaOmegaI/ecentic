import { seo } from "@/lib/seo";

const descriptor = {
  name: seo.name,
  url: seo.host,
  description: seo.description,
  well_known: `${seo.host}/.well-known/ucp`,
  capabilities: [
    "agent-simulation",
    "listing-diagnosis",
    "catalog-optimization",
    "ucp-publishing",
  ],
  contact: {
    email: "hello@ecentic.ai",
  },
} as const;

export const GET = () =>
  new Response(JSON.stringify(descriptor, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
