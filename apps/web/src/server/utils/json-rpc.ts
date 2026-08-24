/**
 * JSON-RPC 2.0 envelope handling for the MCP endpoint.
 *
 * Lives outside `server/app/mcp.ts` because that module carries a file-level
 * `"use server"` — every export there is an addressable server action, and none
 * of this is one. Keeping it here also makes it directly unit-testable without
 * dragging in the database and auth layers behind the tool implementations.
 */

export type JsonRpcMessage = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  /**
   * `protocolVersion` is named explicitly because `initialize` always carries
   * it and it is the one param this layer reads; everything else stays opaque
   * and is validated by the tool that receives it.
   */
  params?: { protocolVersion?: unknown } & Record<string, unknown>;
};

export type ParsedBody =
  | { success: true; batch: boolean; messages: JsonRpcMessage[] }
  | { success: false; message: string };

/**
 * A JSON-RPC message with no `id` is a notification: it gets no reply at all.
 * The key's *absence* is the signal — `{"id": null}` is a (malformed) request,
 * not a notification, so `in` is the correct test and a truthiness check is not.
 */
export const isNotification = (message: object) => !("id" in message);

/**
 * MCP's own notification methods, checked by name as well as by the missing
 * `id`. Some clients send `notifications/initialized` *with* an id; replying to
 * that with `-32601` fails the handshake exactly as hard as the conformant form
 * would, so both shapes are treated as unanswerable.
 */
export const isNotificationMethod = (method?: string) =>
  method?.startsWith("notifications/") ?? false;

export const isAnswerable = (message: JsonRpcMessage) =>
  !isNotification(message) && !isNotificationMethod(message.method);

/**
 * Returns a batch as an array and a single message as a one-element array, so
 * callers have one shape to walk. Batching belongs to the `2025-03-26` protocol
 * version this server advertises; `2025-06-18` removed it, and a client on that
 * version simply never sends one — accepting both costs nothing.
 */
export const parseBody = (text: string): ParsedBody => {
  const json = ((): unknown => {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  })();

  if (json === undefined)
    return { success: false, message: "Invalid JSON payload" };

  if (Array.isArray(json)) {
    if (json.length === 0)
      return { success: false, message: "JSON-RPC batch must not be empty" };
    if (json.some((entry) => typeof entry !== "object" || entry === null))
      return {
        success: false,
        message: "JSON-RPC batch entries must be objects",
      };
    return { success: true, batch: true, messages: json as JsonRpcMessage[] };
  }

  if (typeof json !== "object" || json === null)
    return { success: false, message: "JSON-RPC body must be an object" };

  return { success: true, batch: false, messages: [json as JsonRpcMessage] };
};

/**
 * A client that asks for a version this server speaks gets that version back —
 * the spec requires the echo, and answering `2025-03-26` to a `2025-06-18`
 * client is what makes a transport give up. Anything unrecognised falls back to
 * the version advertised everywhere else.
 */
export const negotiateProtocolVersion = (
  requested: unknown,
  supported: readonly string[],
  fallback: string,
) =>
  typeof requested === "string" &&
  supported.some((version) => version === requested)
    ? requested
    : fallback;
