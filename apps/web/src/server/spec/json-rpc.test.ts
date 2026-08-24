import { describe, expect, test } from "bun:test";
import {
  isAnswerable,
  isNotification,
  isNotificationMethod,
  negotiateProtocolVersion,
  parseBody,
} from "@/server/utils/json-rpc";

describe("notification detection", () => {
  /**
   * The regression this guards: `notifications/initialized` used to fall
   * through the method switch to a `-32601` JSON-RPC error, which every MCP SDK
   * client reads as a failed handshake. It is a notification and must draw no
   * reply at all.
   */
  test("a message with no id is a notification", () => {
    expect(isNotification({ jsonrpc: "2.0", method: "x" })).toBe(true);
  });

  test("an explicit null id is a request, not a notification", () => {
    expect(isNotification({ jsonrpc: "2.0", id: null, method: "x" })).toBe(
      false,
    );
  });

  test("a message with an id is a request", () => {
    expect(isNotification({ jsonrpc: "2.0", id: 1, method: "x" })).toBe(false);
  });

  test("notifications/* is unanswerable even when a client sends an id", () => {
    expect(isNotificationMethod("notifications/initialized")).toBe(true);
    expect(isNotificationMethod("tools/list")).toBe(false);
    expect(isNotificationMethod(undefined)).toBe(false);
    expect(
      isAnswerable({
        jsonrpc: "2.0",
        id: 7,
        method: "notifications/initialized",
      }),
    ).toBe(false);
  });

  test("real requests stay answerable", () => {
    expect(isAnswerable({ jsonrpc: "2.0", id: 1, method: "tools/list" })).toBe(
      true,
    );
  });
});

describe("body parsing", () => {
  test("a single message becomes a one-element non-batch", () => {
    const parsed = parseBody('{"jsonrpc":"2.0","id":1,"method":"ping"}');
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.batch).toBe(false);
    expect(parsed.messages.length).toBe(1);
    expect(parsed.messages[0]?.method).toBe("ping");
  });

  test("an array is reported as a batch", () => {
    const parsed = parseBody(
      '[{"jsonrpc":"2.0","id":1,"method":"ping"},{"jsonrpc":"2.0","method":"notifications/initialized"}]',
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.batch).toBe(true);
    expect(parsed.messages.length).toBe(2);
    expect(parsed.messages.filter(isAnswerable).length).toBe(1);
  });

  test.each([
    ["not json at all", "Invalid JSON payload"],
    ["[]", "JSON-RPC batch must not be empty"],
    ["[1,2]", "JSON-RPC batch entries must be objects"],
    ['"a string"', "JSON-RPC body must be an object"],
    ["null", "JSON-RPC body must be an object"],
  ])("%p is rejected", (input, message) => {
    const parsed = parseBody(input);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.message).toBe(message);
  });
});

describe("protocol version negotiation", () => {
  const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
  const FALLBACK = "2025-03-26";

  test("a supported version is echoed back verbatim", () => {
    expect(negotiateProtocolVersion("2025-06-18", SUPPORTED, FALLBACK)).toBe(
      "2025-06-18",
    );
    expect(negotiateProtocolVersion("2024-11-05", SUPPORTED, FALLBACK)).toBe(
      "2024-11-05",
    );
  });

  test.each([["2030-01-01"], [undefined], [42], [null]])(
    "%p falls back to the advertised version",
    (requested) => {
      expect(negotiateProtocolVersion(requested, SUPPORTED, FALLBACK)).toBe(
        FALLBACK,
      );
    },
  );
});

describe("batch correlation", () => {
  /**
   * A batch must answer every request it was given. The regression this guards
   * is a dispatch whose response cannot be re-read as JSON being dropped from
   * the array — the client would get fewer replies than it sent, with no way to
   * tell which request lost its answer.
   */
  test("every answerable message keeps an id to correlate on", () => {
    const parsed = parseBody(
      '[{"jsonrpc":"2.0","id":"a","method":"ping"},{"jsonrpc":"2.0","method":"notifications/initialized"},{"jsonrpc":"2.0","id":7,"method":"tools/list"}]',
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const answerable = parsed.messages.filter(isAnswerable);
    expect(answerable.map((message) => message.id)).toEqual(["a", 7]);
  });

  test("a batch of only notifications leaves nothing to answer", () => {
    const parsed = parseBody(
      '[{"jsonrpc":"2.0","method":"notifications/initialized"},{"jsonrpc":"2.0","method":"notifications/cancelled"}]',
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.messages.filter(isAnswerable)).toEqual([]);
  });
});
