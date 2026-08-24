import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  API_VERSION,
  apiIndex,
  discoveryIndex,
  healthIndex,
  PLAN_CATALOG,
  plansIndex,
  skillsIndex,
  V1_ENDPOINTS,
} from "@/lib/agent-api";

const HOST = "https://ecentic.ai";

describe("agent API index", () => {
  test("names the versioning strategy an agent has to pin against", () => {
    const index = apiIndex();
    expect(index.versioning.strategy).toBe("url-path");
    expect(index.versioning.current).toBe(`v${API_VERSION}`);
    expect(index.versioning.deprecationNoticeDays).toBeGreaterThanOrEqual(90);
  });

  test("points at the error and rate-limit contracts, not just at itself", () => {
    const index = apiIndex();
    expect(index.errors.mediaType).toBe("application/problem+json");
    expect(index.rateLimit.headers).toContain("Retry-After");
    expect(index.documentation).toBe(`${HOST}/docs`);
  });

  test("every endpoint is absolute, so a client never has to guess the host", () => {
    for (const endpoint of apiIndex().endpoints)
      expect(endpoint.url).toBe(`${HOST}${endpoint.path}`);
  });

  test("declares an authentication mode for every endpoint", () => {
    for (const endpoint of V1_ENDPOINTS)
      expect(["none", "bearer", "x402"]).toContain(endpoint.authentication);
  });
});

describe("discovery index", () => {
  test("lists every protocol with a manifest an agent can fetch", () => {
    for (const protocol of discoveryIndex().protocols) {
      expect(protocol.manifests.length).toBeGreaterThan(0);
      for (const manifest of protocol.manifests)
        expect(manifest).toStartWith(`${HOST}/`);
    }
  });

  test("covers the protocols the site actually implements", () => {
    const keys = discoveryIndex().protocols.map((protocol) => protocol.key);
    expect(keys).toEqual(["mcp", "ucp", "acp", "openapi", "x402"]);
  });

  test("every document URL is absolute", () => {
    for (const url of Object.values(discoveryIndex().documents))
      expect(url).toStartWith(`${HOST}/`);
  });
});

describe("plan catalog", () => {
  test("quotes prices in minor units, never as display strings", () => {
    for (const plan of PLAN_CATALOG) {
      if (plan.price === null) continue;
      expect(Number.isInteger(plan.price.amountCents)).toBe(true);
    }
  });

  test("matches the prices the pricing page renders", () => {
    // Divergence here means a human and an agent are quoted different numbers.
    const messages = JSON.parse(
      readFileSync(join(import.meta.dir, "../../../messages/en.json"), "utf8"),
    ) as { pricing: { plans: Record<string, { figure: string }> } };

    const expected: Record<string, number> = {
      compete: 1490,
      scale: 4490,
      dominate: 14900,
    };

    for (const [key, amountCents] of Object.entries(expected)) {
      const figure = messages.pricing.plans[key]?.figure ?? "";
      expect(Math.round(Number(figure.replace("$", "")) * 100)).toBe(
        amountCents,
      );
      const plan = PLAN_CATALOG.find((entry) => entry.key === key);
      expect(Number(plan?.price?.amountCents)).toBe(amountCents);
    }
  });

  test("only the pay-as-you-go plan carries a performance fee", () => {
    // The fee never rides a subscription — that is the billing model, and an
    // agent reading this catalog must not be able to conclude otherwise.
    for (const plan of PLAN_CATALOG)
      expect(plan.performanceFee === null).toBe(plan.key !== "payg");
  });

  test("exposes checkout and documentation entry points", () => {
    const index = plansIndex();
    expect(index.checkout).toBe(`${HOST}/sign-up`);
    expect(index.documentation).toBe(`${HOST}/pricing`);
  });
});

describe("skills index", () => {
  test("mirrors the well-known skills file", () => {
    const published = JSON.parse(
      readFileSync(
        join(
          import.meta.dir,
          "../../../public/.well-known/agent-skills/index.json",
        ),
        "utf8",
      ),
    ) as { skills: ReadonlyArray<{ name: string; url: string }> };

    const served = skillsIndex().skills;
    expect(served.map((skill): string => skill.name)).toEqual(
      published.skills.map((skill) => skill.name),
    );
    expect(served.map((skill): string => skill.path)).toEqual(
      published.skills.map((skill) => skill.url),
    );
  });

  test("every skill says when to reach for it", () => {
    for (const skill of skillsIndex().skills)
      expect(skill.whenToUse.length).toBeGreaterThan(20);
  });
});

describe("health", () => {
  test("returns the server clock so a caller can detect skew", () => {
    const stamp = "2026-08-24T10:00:00.000Z";
    expect(healthIndex(stamp)).toEqual({
      status: "ok",
      service: "ecentic",
      version: API_VERSION,
      timestamp: stamp,
    });
  });
});
