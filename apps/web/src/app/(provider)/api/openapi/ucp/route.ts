import { seo } from "@/lib/seo";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "ecentic UCP discovery API",
    version: "1.0.0",
    description:
      "Public Universal Commerce Protocol discovery surfaces for ecentic and merchant storefronts.",
  },
  servers: [{ url: seo.host }],
  paths: {
    "/api/ucp": {
      get: {
        summary: "Platform capability descriptor",
        operationId: "getUcpDescriptor",
        responses: {
          "200": {
            description: "ecentic UCP platform descriptor",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
    },
    "/.well-known/ucp": {
      get: {
        summary: "ecentic Universal Commerce Profile",
        operationId: "getWellKnownUcp",
        responses: {
          "200": {
            description: "UCP profile document",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const GET = () =>
  new Response(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
