import { seo } from "@/lib/seo";

const spec = {
  openapi: "3.1.0",
  info: {
    title: "ecentic MCP API",
    version: "1.0.0",
    description:
      "JSON-RPC Model Context Protocol endpoint for AI agents. Authenticate with Authorization: Bearer ecentic_sk_... or an OAuth access token from /.well-known/oauth-authorization-server.",
  },
  servers: [{ url: seo.host }],
  paths: {
    "/api/mcp": {
      get: {
        summary: "MCP server descriptor",
        operationId: "getMcpDescriptor",
        responses: {
          "200": {
            description: "Server metadata and tool list hints",
            content: {
              "application/json": {
                schema: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      post: {
        summary: "JSON-RPC MCP request",
        operationId: "postMcp",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["jsonrpc", "method"],
                properties: {
                  jsonrpc: { type: "string", enum: ["2.0"] },
                  id: {
                    oneOf: [
                      { type: "string" },
                      { type: "number" },
                      { type: "null" },
                    ],
                  },
                  method: { type: "string" },
                  params: { type: "object", additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "JSON-RPC response",
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
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description:
          "Agent API key (ecentic_sk_...) or OAuth access token from the authorization server.",
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
