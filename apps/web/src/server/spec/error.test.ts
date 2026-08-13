import { describe, expect, test } from "bun:test";
import {
  ConflictError,
  DatabaseError,
  ErrorProtocol,
  IntegrationAuthError,
  InvalidSignatureError,
  isExpected,
  isIntegrationAuthError,
  isTransientConnectionError,
  NotFoundError,
  RequestError,
  UnauthenticatedError,
  UntrustedRequestError,
  ValidationError,
} from "../utils/error";

describe("isExpected", () => {
  test.each([
    [new ValidationError("nope"), true],
    [new ConflictError("nope"), true],
    [new InvalidSignatureError("nope"), true],
    [new UntrustedRequestError("nope"), true],
    [new UnauthenticatedError("nope"), false],
    [new DatabaseError("nope"), false],
  ])("classifies %s", (error, expected) => {
    expect(isExpected(error)).toBe(expected);
  });

  test("the two public-endpoint guards stay expected, session auth does not", () => {
    // Both guards front URLs anyone can POST and record their own rejections at
    // `warning`, so `withContext` must not also raise them as exceptions —
    // flipping either one turns every scanner into a Sentry issue. A failed
    // session auth is a different thing and stays reportable. Pinned here
    // rather than in cron.ts / inbound.ts because importing those pulls the
    // postgres and redis clients in at module scope.
    expect(isExpected(new UntrustedRequestError("Unauthorized"))).toBe(true);
    expect(
      isExpected(new InvalidSignatureError("Invalid HMAC signature")),
    ).toBe(true);
    expect(isExpected(new UnauthenticatedError("Unauthorized"))).toBe(false);
  });
});

type ErrorClass = {
  readonly errorName: string;
  readonly name: string;
  new (message: string): Error;
};

describe("errorName", () => {
  // The trap: `class Foo extends error("foo-error")` gives Foo its own static
  // `name` of "Foo", shadowing the wire name. Code that compared against the
  // static matched nothing — silently, since the types claimed otherwise.
  test.each<[string, ErrorClass]>([
    ["request-error", RequestError],
    ["validation-error", ValidationError],
    ["not-found-error", NotFoundError],
    ["integration-auth-error", IntegrationAuthError],
  ])("%s is reachable from the class, not shadowed by it", (wire, Class) => {
    expect(Class.errorName).toBe(wire);
    expect(new Class("boom").name).toBe(wire);
    // The half that bites: the static `name` is the JS class name, not the wire
    // name, so it must never be used as the identity.
    expect(Class.name).not.toBe(wire);
  });
});

describe("ErrorProtocol round-trip", () => {
  const round = <E extends Error>(error: E) =>
    ErrorProtocol.deserialize(ErrorProtocol.serialize(error));

  test.each([
    new RequestError("boom"),
    new ValidationError("bad input"),
    new ConflictError("already claimed"),
    new IntegrationAuthError("reconnect"),
  ])("preserves the name of %s across the client boundary", (error) => {
    const revived = round(error);
    expect(revived.name).toBe(error.name);
    expect(revived.message).toBe(error.message);
  });

  // The payoff, and what the mis-keyed map cost: every error arrived on the
  // client as a bare `Error` named "Error", so every name-based classifier
  // answered false regardless of what was actually thrown.
  test("a revived error still classifies", () => {
    expect(isExpected(round(new ValidationError("bad")))).toBe(true);
    expect(isExpected(round(new RequestError("boom")))).toBe(false);
    expect(isIntegrationAuthError(round(new IntegrationAuthError("x")))).toBe(
      true,
    );
    expect(isIntegrationAuthError(round(new RequestError("x")))).toBe(false);
  });

  test("an unrecognised name falls back to Error rather than throwing", () => {
    const revived = round(
      Object.assign(new Error("mystery"), { name: "from-a-newer-deploy" }),
    );
    expect(revived.message).toBe("mystery");
  });
});

/**
 * The shape Node hands postgres.js when a pooled socket stops answering:
 * `errnoException(errno, "write")`, which postgres.js passes through to the
 * pending query untouched rather than wrapping in one of its own errors.
 */
const socketError = (code: string) =>
  Object.assign(new Error(`write ${code}`), { code, syscall: "write" });

/** How Drizzle rethrows every driver failure: `DrizzleQueryError(sql, params, cause)`. */
const drizzleError = (cause: Error) =>
  Object.assign(
    new Error(`Failed query: select "id" from "store" where "userId" = $1`, {
      cause,
    }),
    { name: "DrizzleQueryError" },
  );

describe("isTransientConnectionError", () => {
  test("catches the dead-socket write that took down the dashboard", () => {
    // ECENTIC-D5, reproduced at full depth: Fluid froze the instance, Neon's
    // pooler dropped its end of an idle socket, and the next write went
    // unanswered until the kernel gave up. The query never reached Postgres, so
    // re-running it on a fresh connection is safe — that is what this gates.
    expect(
      isTransientConnectionError(drizzleError(socketError("ETIMEDOUT"))),
    ).toBe(true);
  });

  test("catches the connect that stalled while its siblings served", () => {
    // ECENTIC-D9: one of four parallel dashboard reads needed a fresh
    // connection and postgres.js gave up at `connect_timeout`, while the other
    // three connected and returned in the same instant. The attempt never
    // reached Postgres, so the retry this gates opens a new socket instead of
    // failing the whole page. postgres.js builds this error itself
    // (`Errors.connection`), with the unresolved host baked into the message.
    const connectTimeout = Object.assign(
      new Error("write CONNECT_TIMEOUT undefined:undefined"),
      { code: "CONNECT_TIMEOUT", errno: "CONNECT_TIMEOUT" },
    );
    expect(isTransientConnectionError(drizzleError(connectTimeout))).toBe(true);
  });

  test.each([
    ["ECONNRESET", true],
    ["EPIPE", true],
    ["ETIMEDOUT", true],
    ["CONNECTION_CLOSED", true],
    ["CONNECTION_DESTROYED", true],
    ["CONNECTION_ENDED", true],
    // Excluded after ECENTIC-CD ("unreachable, a retry doubles the wait"),
    // re-admitted after ECENTIC-D9 stalled one connect while its three sibling
    // reads served fine — see the isolated-stall test below.
    ["CONNECT_TIMEOUT", true],
    // A real rejection from Postgres. Retrying replays it verbatim.
    ["23505", false],
    ["42P01", false],
  ])("%s → %s", (code, expected) => {
    expect(isTransientConnectionError(drizzleError(socketError(code)))).toBe(
      expected,
    );
    expect(isTransientConnectionError(socketError(code))).toBe(expected);
  });

  test("ignores errors carrying no code at all", () => {
    expect(isTransientConnectionError(new Error("boom"))).toBe(false);
    expect(isTransientConnectionError(new DatabaseError("boom"))).toBe(false);
  });

  test("survives non-Error input rather than throwing on it", () => {
    // `resultify` types its error as `E` but genuinely captures whatever was
    // thrown, so this can be handed a string or a null.
    expect(isTransientConnectionError("write ETIMEDOUT")).toBe(false);
    expect(isTransientConnectionError(null)).toBe(false);
    expect(isTransientConnectionError(undefined)).toBe(false);
  });

  test("walks a bounded stretch of the cause chain", () => {
    const nest = (depth: number): Error =>
      depth === 0
        ? socketError("ETIMEDOUT")
        : new Error(`layer ${depth}`, { cause: nest(depth - 1) });

    // The real chain is two deep (DrizzleQueryError → socket error); the guard
    // leaves headroom past that but must not walk a cyclic or absurd chain.
    expect(isTransientConnectionError(nest(3))).toBe(true);
    expect(isTransientConnectionError(nest(4))).toBe(false);
  });
});
