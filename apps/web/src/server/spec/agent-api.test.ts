import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  API_VERSION,
  apiIndex,
  discoveryIndex,
  exceedsSandboxBody,
  healthIndex,
  onboardingIndex,
  PLAN_CATALOG,
  plansIndex,
  SANDBOX_ASSISTANTS,
  SANDBOX_LIMITS,
  sandboxIndex,
  sandboxSimulation,
  skillsIndex,
  V1_ENDPOINTS,
} from "@/lib/agent-api";
import { DOCUMENTED_MCP_TOOLS } from "@/lib/mcp-docs";
import { Utils } from "@/server/app/mcp/utils";

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

describe("MCP documentation", () => {
  /**
   * `/docs/mcp` lists the tools by hand so its copy can be typed against the
   * message catalog. That is only safe while the list is the server's actual
   * catalog — a tool added to the server and not to the page is a documented
   * surface with an undocumented hole in it.
   */
  test("the documented tool list is the live tool catalog", () => {
    expect(DOCUMENTED_MCP_TOOLS.map((tool) => tool.name)).toEqual(
      Utils.tools.map((tool) => tool.name),
    );
  });
});

describe("onboarding signals", () => {
  /**
   * The audit's complaint was "described but not verified live". Every signal
   * therefore has to carry something an auditor can fetch — a claim without a
   * `verify` URL is exactly the shape that scored half marks.
   */
  test("every signal carries a fetchable verify URL and its evidence", () => {
    const index = onboardingIndex();
    expect(index.signals.length).toBeGreaterThanOrEqual(4);

    for (const signal of index.signals) {
      expect(signal.verify, signal.key).toStartWith("https://ecentic.ai");
      expect(signal.evidence.length, signal.key).toBeGreaterThan(15);
      expect(signal.summary.length, signal.key).toBeGreaterThan(30);
    }
  });

  test("names the four signals the audit looked for", () => {
    const keys = onboardingIndex().signals.map((signal) => signal.key);
    expect(keys).toContain("free-tier");
    expect(keys).toContain("self-serve-api-keys");
    expect(keys).toContain("sandbox");
    expect(keys).toContain("zero-auth-access");
  });

  test("the free-tier claim matches the plan catalog", () => {
    const free = PLAN_CATALOG.filter((plan) => plan.price === null);
    expect(free.map((plan) => plan.key)).toEqual(["scan", "payg"]);
  });
});

describe("sandbox", () => {
  const input = {
    product: { title: "Alpine Down Jacket", priceCents: 24900 },
    competitors: [{ title: "Summit Puffer", priceCents: 21900 }],
    assistants: SANDBOX_ASSISTANTS,
  };

  /**
   * A sandbox whose output shifts between identical calls is worse than none:
   * a client cannot tell its own change from the sandbox's noise. Determinism
   * is the contract the endpoint advertises, so it is asserted, not assumed.
   */
  test("identical input produces identical output", () => {
    expect(sandboxSimulation(input)).toEqual(sandboxSimulation(input));
  });

  test("different input produces different scores", () => {
    const other = sandboxSimulation({
      ...input,
      product: { title: "Something else entirely" },
    });
    expect(other.result.comparisons[0]?.productScore).not.toBe(
      sandboxSimulation(input).result.comparisons[0]?.productScore,
    );
  });

  test("labels itself as synthetic in a way a client cannot miss", () => {
    const result = sandboxSimulation(input);
    expect(result.mode).toBe("sandbox_fixture");
    expect(result.deterministic).toBe(true);
    expect(result.disclaimer.toLowerCase()).toContain("synthetic");
    expect(sandboxIndex().mode).toBe("sandbox_fixture");
    expect(sandboxIndex().guarantees.persistence).toBe("none");
    expect(sandboxIndex().guarantees.billing).toBe("none");
  });

  test("one comparison per assistant per competitor, and a matching win rate", () => {
    const result = sandboxSimulation(input);
    expect(result.result.comparisons.length).toBe(
      SANDBOX_ASSISTANTS.length * input.competitors.length,
    );
    const wins = result.result.comparisons.filter(
      (comparison) => comparison.winner === "product",
    ).length;
    expect(result.result.wins).toBe(wins);
    expect(result.result.winRate).toBeCloseTo(
      wins / result.result.comparisons.length,
    );
  });

  /**
   * The ceiling is a byte ceiling. `String.length` counts UTF-16 code units, so
   * a body of 16k multibyte characters passes a naive check while arriving as
   * roughly 48KB — exactly the upload the limit exists to refuse.
   */
  test("the body ceiling is measured in bytes, not code units", () => {
    const underBoth = "a".repeat(SANDBOX_LIMITS.bodyBytes);
    expect(exceedsSandboxBody(underBoth)).toBe(false);
    expect(exceedsSandboxBody(`${underBoth}a`)).toBe(true);

    // Three bytes each, so a third of the character budget is the whole byte
    // budget — a code-unit check would wave this through.
    const multibyte = "€".repeat(SANDBOX_LIMITS.bodyBytes / 2);
    expect(multibyte.length).toBeLessThan(SANDBOX_LIMITS.bodyBytes);
    expect(exceedsSandboxBody(multibyte)).toBe(true);
  });

  test("scores stay inside the band the schema promises", () => {
    for (const comparison of sandboxSimulation(input).result.comparisons) {
      expect(comparison.productScore).toBeGreaterThanOrEqual(55);
      expect(comparison.productScore).toBeLessThanOrEqual(95);
      expect(comparison.competitorScore).toBeGreaterThanOrEqual(55);
      expect(comparison.competitorScore).toBeLessThanOrEqual(95);
    }
  });
});
