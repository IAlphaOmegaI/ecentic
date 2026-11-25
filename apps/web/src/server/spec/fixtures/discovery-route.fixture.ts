import { expect, mock, test } from "bun:test";
import { ValidationError } from "../../utils/error";

const state = { failure: new Error("run failed") };
mock.module("../../app/intelligence/discovery-report", () => ({
  accessCode: () => "fixture",
  isAuthorized: (candidates: unknown[]) => candidates.includes("fixture"),
}));
mock.module("../../app/intelligence/discovery-run", () => ({
  executeDiscovery: async () => ({ success: false, error: state.failure }),
}));
const Route = await import("../../../app/(provider)/api/dev/discovery/route");

test.each([
  [new ValidationError("invalid store"), 400],
  [new Error("generation failed"), 500],
] as const)("maps %s to its HTTP status", async (error, status) => {
  state.failure = error;
  const request = new Request(
    "https://ecentic.test/api/dev/discovery?store=brand.test&q=mug",
    { headers: { authorization: "Bearer fixture" } },
  );
  const response = await Route.GET(request);
  expect(response.status).toBe(status);
  expect(await response.text()).toBe(error.message);
});

test("rejects an unauthorized request before the discovery engine", async () => {
  const response = await Route.GET(
    new Request(
      "https://ecentic.test/api/dev/discovery?store=brand.test&q=mug",
    ),
  );
  expect(response.status).toBe(401);
});
