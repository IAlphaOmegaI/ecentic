import { problem } from "./problem";

/**
 * The 405 the MCP endpoint returns for `GET` with `Accept: text/event-stream`
 * and for `DELETE`.
 *
 * Streamable HTTP only requires the status; the body is ours to choose, and an
 * empty one tells a client nothing about why its stream open or session
 * teardown was refused. An RFC 9457 problem names the reason in the same shape
 * every other failure on this host uses, so one error path handles both.
 *
 * Lives here rather than in `server/app/mcp.ts` because that module carries a
 * file-level `"use server"`, which would make this an addressable server
 * action, and because the `/mcp` and `/api/mcp` route handlers need it too.
 */
export const mcpMethodNotAllowed = (
  detail = "ecentic's MCP endpoint offers no server-initiated stream and holds no session: every response arrives on the POST channel.",
) =>
  problem("method-not-allowed", detail, {
    instance: "/api/mcp",
    headers: { Allow: "POST, OPTIONS" },
  });
