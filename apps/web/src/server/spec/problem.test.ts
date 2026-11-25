import { describe, expect, test } from "bun:test";
import {
  ConflictError,
  NotFoundError,
  SubscriptionRequiredError,
  TimeoutError,
  UnauthenticatedError,
  UnauthorizedError,
  ValidationError,
} from "../utils/error";
import {
  PROBLEM_CONTENT_TYPE,
  PROBLEMS,
  type ProblemCode,
  problem,
  problemBody,
  problemCodeFor,
} from "../utils/problem";

const read = async (response: Response) => ({
  status: response.status,
  contentType: response.headers.get("content-type"),
  body: (await response.json()) as Record<string, unknown>,
});

describe("problem", () => {
  test("serves application/problem+json, not application/json", async () => {
    // The media type is how a generic client knows the body describes a
    // failure rather than the resource it asked for.
    const { contentType } = await read(problem("not-found", "nope"));
    expect(contentType).toBe(PROBLEM_CONTENT_TYPE);
  });

  test("takes its status from the catalogue", async () => {
    const { status, body } = await read(problem("rate-limited", "slow down"));
    expect(status).toBe(429);
    expect(body["status"]).toBe(429);
  });

  test("carries a code, a resolution hint, and a documentation anchor", async () => {
    const { body } = await read(
      problem("unauthenticated", "missing bearer", {
        instance: "/api/v1/plans",
      }),
    );

    expect(body["code"]).toBe("unauthenticated");
    expect(body["detail"]).toBe("missing bearer");
    expect(body["instance"]).toBe("/api/v1/plans");
    expect(body["resolution"]).toContain("auth.md");
    expect(body["type"]).toBe("https://ecentic.ai/docs/errors#unauthenticated");
  });

  test("omits instance when there is none rather than sending null", () => {
    expect(problemBody("internal-error", "boom")).not.toHaveProperty(
      "instance",
    );
  });

  test("an explicit status overrides the catalogue", async () => {
    // How a caller pins an exact code a partner already integrated against.
    const { status, body } = await read(
      problem("invalid-request", "bad payload", { status: 418 }),
    );
    expect(status).toBe(418);
    // The body still reports the type's canonical status.
    expect(body["status"]).toBe(400);
  });

  test("is never cached", () => {
    expect(problem("not-found", "nope").headers.get("cache-control")).toBe(
      "no-store",
    );
  });

  const MAPPED: ReadonlyArray<[Error, ProblemCode]> = [
    [new UnauthenticatedError("x"), "unauthenticated"],
    [new UnauthorizedError("x"), "unauthorized"],
    [new NotFoundError("x"), "not-found"],
    [new ConflictError("x"), "conflict"],
    [new ValidationError("x"), "validation-failed"],
    [new TimeoutError("x"), "upstream-timeout"],
    [new SubscriptionRequiredError("x"), "subscription-required"],
    [new Error("x"), "internal-error"],
  ];

  test.each(MAPPED)("maps %s onto a problem code", (error, expected) => {
    expect(problemCodeFor(error)).toBe(expected);
  });

  test("every catalogue entry has a plausible status and a resolution", () => {
    for (const [code, entry] of Object.entries(PROBLEMS)) {
      expect(entry.status).toBeGreaterThanOrEqual(400);
      expect(entry.status).toBeLessThan(600);
      expect(entry.title.length).toBeGreaterThan(0);
      // A code without a next step is just a different way of saying "no".
      expect(entry.resolution.length).toBeGreaterThan(20);
      expect(code).toMatch(/^[a-z][a-z-]*[a-z]$/);
    }
  });
});
