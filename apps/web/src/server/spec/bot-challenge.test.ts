import { describe, expect, test } from "bun:test";
import { classifyPageAccess } from "@/server/app/intelligence/bot-challenge";

/**
 * The readiness audit samples a store's product pages the way a hosted
 * shopping agent would. A bot wall stops that agent before it reads anything,
 * so a challenge page must come back as `challenged` — never as a page that
 * loaded with no structured data, and never silently dropped.
 */

const page = (
  status: number,
  body = "",
  headers: Record<string, string> = {},
) => ({ status, body, headers: new Headers(headers) });

const PRODUCT_PAGE = `<html><head><title>Trail Runner 2</title>
<script type="application/ld+json">{"@type":"Product","name":"Trail Runner 2"}</script>
</head><body>In stock</body></html>`;

describe("classifyPageAccess", () => {
  test("a product page that loads is ok", () => {
    expect(classifyPageAccess(page(200, PRODUCT_PAGE))).toEqual({ kind: "ok" });
  });

  test("a Cloudflare challenge served as 403 names the vendor", () => {
    expect(
      classifyPageAccess(
        page(403, "<title>Just a moment...</title>", {
          "cf-mitigated": "challenge",
          server: "cloudflare",
        }),
      ),
    ).toEqual({ kind: "challenged", vendor: "Cloudflare" });
  });

  test("a Cloudflare interstitial served as 200 is still a challenge", () => {
    const interstitial = `<!DOCTYPE html><html><head><title>Just a moment...</title></head>
<body><script>window._cf_chl_opt = { cType: "managed" };</script></body></html>`;

    expect(classifyPageAccess(page(200, interstitial))).toEqual({
      kind: "challenged",
      vendor: "Cloudflare",
    });
  });

  test("Cloudflare's sensor script on a healthy page is not a challenge", () => {
    const withSensor = PRODUCT_PAGE.replace(
      "</body>",
      '<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script></body>',
    );

    expect(
      classifyPageAccess(page(200, withSensor, { server: "cloudflare" })),
    ).toEqual({ kind: "ok" });
  });

  test("an AWS WAF challenge answered with 202 is not a loaded page", () => {
    expect(
      classifyPageAccess(page(202, "", { "x-amzn-waf-action": "challenge" })),
    ).toEqual({ kind: "challenged", vendor: "AWS WAF" });
  });

  test("vendor block pages are recognised by their markup", () => {
    expect(
      classifyPageAccess(
        page(403, '<iframe src="https://geo.captcha-delivery.com/captcha/">'),
      ),
    ).toEqual({ kind: "challenged", vendor: "DataDome" });
    expect(
      classifyPageAccess(page(403, '<div id="px-captcha"></div>')),
    ).toEqual({ kind: "challenged", vendor: "HUMAN (PerimeterX)" });
    expect(
      classifyPageAccess(
        page(
          403,
          "Reference #18.5f2c3e17 https://errors.edgesuite.net/18.5f2c3e17",
        ),
      ),
    ).toEqual({ kind: "challenged", vendor: "Akamai" });
  });

  test("a bare 403 or 429 is a wall even without a vendor signature", () => {
    expect(classifyPageAccess(page(403, "Forbidden"))).toEqual({
      kind: "challenged",
      vendor: null,
    });
    expect(classifyPageAccess(page(429))).toEqual({
      kind: "challenged",
      vendor: null,
    });
  });

  test("an outage or missing page is unreachable, not a challenge", () => {
    expect(classifyPageAccess(page(503, "Service Unavailable"))).toEqual({
      kind: "unreachable",
    });
    expect(classifyPageAccess(page(404, "Not Found"))).toEqual({
      kind: "unreachable",
    });
  });
});
