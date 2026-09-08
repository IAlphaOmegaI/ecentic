import { describe, expect, test } from "bun:test";
import { GET } from "@/app/robots.txt/route";
import { V1_ENDPOINTS } from "@/lib/agent-api";

/**
 * robots.txt is a contract with the agents this product is built for, and it
 * is one line away from contradicting every discovery document the app
 * publishes: `/openapi.json`, `/.well-known/api-catalog` and `/llms.txt` all
 * send an agent to `/api/v1`, and a blanket `Disallow: /api/` tells a compliant
 * fetcher to refuse the trip.
 */

type Rule = { kind: "Allow" | "Disallow"; path: string };

const rules = (body: string): Rule[] =>
  body.split("\n").flatMap((line) => {
    const matched = line.match(/^(Allow|Disallow): (\S+)$/);
    if (!matched) return [];

    return [{ kind: matched[1] as Rule["kind"], path: matched[2] as string }];
  });

/**
 * RFC 9309 §2.2.2: the most specific — longest — matching rule wins, and a path
 * no rule matches is allowed.
 */
const byLongestMatch = (path: string, parsed: Rule[]) => {
  const matching = parsed
    .filter((rule) => path.startsWith(rule.path))
    .sort((left, right) => right.path.length - left.path.length);

  return matching[0]?.kind ?? "Allow";
};

/**
 * What a large share of deployed parsers actually do — Python's
 * `urllib.robotparser` among them: take the first matching line in the file and
 * stop. An `Allow` written after the `Disallow` it excepts is never reached
 * under this reading, which is how a file that is correct by the RFC can still
 * close the public API to a real client.
 */
const byFirstMatch = (path: string, parsed: Rule[]) =>
  parsed.find((rule) => path.startsWith(rule.path))?.kind ?? "Allow";

/** Only a rule set both readings agree on is actually safe to ship. */
const verdict = (path: string, parsed: Rule[]) => {
  const longest = byLongestMatch(path, parsed);
  const first = byFirstMatch(path, parsed);

  return longest === first ? longest : "ambiguous";
};

const body = async () => await (await GET()).text();

describe("robots.txt", () => {
  test("resolves identically under first-match and longest-match parsers", async () => {
    // The difference between the two readings is invisible in the file and
    // total in effect, so it is asserted rather than reasoned about.
    const parsed = rules(await body());

    for (const path of [
      "/api/v1",
      "/api/v1/news",
      "/api/auth/session",
      "/dashboard/products",
    ])
      expect(byFirstMatch(path, parsed), path).toBe(
        byLongestMatch(path, parsed),
      );
  });

  test("every public agent API endpoint it advertises is reachable", async () => {
    const parsed = rules(await body());

    const published = V1_ENDPOINTS.filter((endpoint) =>
      endpoint.path.startsWith("/api/v1"),
    );

    expect(published.length).toBeGreaterThan(0);
    for (const endpoint of published)
      expect(verdict(endpoint.path, parsed), endpoint.path).toBe("Allow");
  });

  test("the exception does not open the rest of /api", async () => {
    const parsed = rules(await body());

    for (const path of [
      "/api/auth/session",
      "/api/cron/scan",
      "/api/dev/prospects",
      "/api/stripe/webhook",
      "/api/webhooks/babylovegrowth",
      "/api/integrations/shopify/callback",
      "/api/tracking/visit",
    ])
      expect(verdict(path, parsed), path).toBe("Disallow");
  });

  test("still closes the human-only areas", async () => {
    const parsed = rules(await body());

    for (const path of [
      "/dashboard/products",
      "/onboarding/connect",
      "/verify",
    ])
      expect(verdict(path, parsed), path).toBe("Disallow");
  });

  test("keeps the content signal and the sitemap pointer", async () => {
    const text = await body();

    expect(text).toContain(
      "Content-Signal: ai-train=no, search=yes, ai-input=yes",
    );
    expect(text).toContain("Sitemap: https://ecentic.ai/sitemap.xml");
  });
});
