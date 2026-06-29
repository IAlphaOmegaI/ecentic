import { seo } from "@/lib/seo";

const UCP_VERSION = "2026-04-22";

const profile = {
  version: UCP_VERSION,
  status: "success",
  merchant: {
    name: seo.name,
    legalName: "ecentic",
    url: seo.host,
    logo: `${seo.host}/icons/icon-512.png`,
    description: seo.description,
    contact: {
      email: "hello@ecentic.ai",
    },
    sameAs: [...seo.links],
  },
  services: {
    "ai.ecentic.agent-commerce": [
      {
        version: UCP_VERSION,
        transport: "rest",
        endpoint: `${seo.host}/api/ucp`,
        description:
          "ecentic platform descriptor. Point AI shopping agents and crawlers here to discover how the ecentic catalog simulation, diagnosis, and optimization services are exposed.",
      },
    ],
    "ai.ecentic.simulation": [
      {
        version: UCP_VERSION,
        transport: "rest",
        endpoint: `${seo.host}/api/ucp`,
        description:
          "Multi-model simulation of how shopping agents compare product listings against competitors across GPT-4, Claude, Gemini, and Perplexity.",
      },
    ],
  },
  payment_handlers: {},
  supported_versions: {
    [UCP_VERSION]: `${seo.host}/.well-known/ucp`,
  },
} as const;

export const GET = () =>
  new Response(JSON.stringify(profile, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
