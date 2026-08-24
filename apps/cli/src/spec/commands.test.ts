import { describe, expect, test } from "bun:test";
import {
  COMMANDS,
  DEFAULT_HOST,
  formatBody,
  formatFailure,
  formatRateLimit,
  HELP,
  parseOptions,
  plan,
} from "../commands";

describe("parseOptions", () => {
  test("defaults to the production host", () => {
    expect(parseOptions([]).host).toBe(DEFAULT_HOST);
  });

  test("strips a trailing slash so paths never double up", () => {
    expect(parseOptions(["--host", "http://localhost:3000/"]).host).toBe(
      "http://localhost:3000",
    );
  });

  test("a flag beats the environment", () => {
    const options = parseOptions(["--api-key", "flag"], {
      ECENTIC_API_KEY: "environment",
    });
    expect(options.apiKey).toBe("flag");
  });

  test("falls back to ECENTIC_API_KEY", () => {
    expect(parseOptions([], { ECENTIC_API_KEY: "environment" }).apiKey).toBe(
      "environment",
    );
  });

  test("prints indented JSON unless --raw", () => {
    expect(parseOptions([]).pretty).toBe(true);
    expect(parseOptions(["--raw"]).pretty).toBe(false);
  });
});

describe("plan", () => {
  test("no arguments prints help rather than guessing", () => {
    expect(plan([]).kind).toBe("help");
  });

  test.each(COMMANDS.map((command) => [command.name, command.path] as const))(
    "%s resolves to GET %s",
    (name, path) => {
      const step = plan([name]);
      expect(step).toMatchObject({
        kind: "request",
        method: "GET",
        url: `${DEFAULT_HOST}${path}`,
      });
    },
  );

  test("sends the bearer key only when there is one", () => {
    const anonymous = plan(["plans"]);
    expect(anonymous).toMatchObject({ kind: "request" });
    if (anonymous.kind !== "request") throw new Error("expected a request");
    expect(anonymous.headers.Authorization).toBeUndefined();

    const authenticated = plan(["plans"], { ECENTIC_API_KEY: "ecentic_sk_x" });
    if (authenticated.kind !== "request") throw new Error("expected a request");
    expect(authenticated.headers.Authorization).toBe("Bearer ecentic_sk_x");
  });

  test("tools is shorthand for a tools/list JSON-RPC call", () => {
    const step = plan(["tools"]);
    if (step.kind !== "request") throw new Error("expected a request");

    expect(step.method).toBe("POST");
    expect(step.url).toBe(`${DEFAULT_HOST}/api/mcp`);
    expect(JSON.parse(step.body ?? "")).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
  });

  test("mcp forwards the method and parsed params", () => {
    const step = plan([
      "mcp",
      "tools/call",
      '{"name":"list_plans","arguments":{}}',
    ]);
    if (step.kind !== "request") throw new Error("expected a request");

    expect(JSON.parse(step.body ?? "")).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "list_plans", arguments: {} },
    });
  });

  test("mcp without a method is a usage error, not an empty call", () => {
    expect(plan(["mcp"])).toMatchObject({ kind: "error" });
  });

  test("unparseable params fail before the request, naming the input", () => {
    const step = plan(["mcp", "tools/call", "{not json"]);
    expect(step.kind).toBe("error");
    if (step.kind !== "error") throw new Error("expected an error");
    expect(step.message).toContain("{not json");
  });

  test("an unknown command points at --help", () => {
    const step = plan(["teleport"]);
    expect(step.kind).toBe("error");
    if (step.kind !== "error") throw new Error("expected an error");
    expect(step.message).toContain("--help");
  });

  test("--host redirects every command", () => {
    const step = plan(["health", "--host", "http://localhost:3000"]);
    expect(step).toMatchObject({ url: "http://localhost:3000/api/v1/health" });
  });

  test("help lists every command it can run", () => {
    for (const command of COMMANDS) expect(HELP).toContain(command.name);
  });
});

describe("output", () => {
  test("renders a problem document as its code, detail, and resolution", () => {
    const rendered = formatFailure(429, {
      code: "rate-limited",
      title: "Rate limit exceeded",
      detail: "Exceeded 120 requests per 60s.",
      resolution: "Wait for Retry-After seconds, then retry.",
    });

    expect(rendered).toContain("HTTP 429 — Rate limit exceeded");
    expect(rendered).toContain("code:       rate-limited");
    expect(rendered).toContain("resolution: Wait for Retry-After");
  });

  test("falls back to the raw payload when the body is not a problem", () => {
    expect(formatFailure(500, { oops: true })).toContain('"oops": true');
  });

  test("excerpts a non-problem body instead of dumping a whole error page", () => {
    // Pointing --host at something that answers HTML used to print the entire
    // document, burying the status line.
    const html = `<!DOCTYPE html>${"<div>x</div>".repeat(500)}`;
    const rendered = formatFailure(404, html);

    expect(rendered).toStartWith("Request failed with HTTP 404");
    expect(rendered.length).toBeLessThan(600);
    expect(rendered).toContain("more characters");
  });

  test("--raw drops the indentation so output pipes cleanly", () => {
    expect(formatBody({ a: 1 }, false)).toBe('{"a":1}');
    expect(formatBody({ a: 1 }, true)).toBe('{\n  "a": 1\n}');
  });

  test("summarises the rate-limit window when the server counted one", () => {
    const headers = new Headers({
      "RateLimit-Remaining": "118",
      "RateLimit-Reset": "42",
    });
    expect(formatRateLimit(headers)).toBe(
      "rate limit: 118 remaining, resets in 42s",
    );
  });

  test("says nothing when the server sent no count", () => {
    expect(formatRateLimit(new Headers())).toBeNull();
  });
});
