import * as MCP from "@/server/app/mcp";

export const GET = (request: Request) =>
  MCP.getRoute(request.headers.get("accept"));

export const POST = async (request: Request) => MCP.handleRequest(request);

/**
 * Streamable HTTP session termination. ecentic issues no `Mcp-Session-Id`, so
 * there is nothing to terminate and the spec's answer is 405.
 */
export const DELETE = () =>
  new Response(null, {
    status: 405,
    headers: { Allow: "POST, OPTIONS", "Cache-Control": "no-store" },
  });

export const OPTIONS = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Accept, Mcp-Session-Id, MCP-Protocol-Version",
      "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
    },
  });
