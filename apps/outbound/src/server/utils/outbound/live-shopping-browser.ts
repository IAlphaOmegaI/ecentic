import "server-only";

import { setTimeout as delay } from "node:timers/promises";
import { type Result, resultify } from "@zenncore/utils";
import { z } from "zod";
import * as HTTP from "@/server/utils/http";
import { isSafePublicHttpUrl } from "@/server/utils/ssrf";
import { classifyPageAccess } from "./evidence/bot-challenge";
import { IntegrationError } from "./http";
import {
  type AiCapture,
  aiCaptureSchema,
  type BrowserResearch,
  browserResearchSchema,
  publicUrlSchema,
  type RawCapture,
  type Source,
} from "./live-shopping-contract";
import {
  type Dependencies,
  digest,
  keyValid,
  providerJson,
} from "./live-shopping-http";
import { blockedByRobots } from "./research";

const HOST = "https://api.firecrawl.dev/v2";
type BrowserDependencies = Dependencies & {
  page?: typeof HTTP.page;
  safeUrl?: typeof isSafePublicHttpUrl;
};
const renderedSchema = z.object({
  url: publicUrlSchema,
  status: z.number().int().min(100).max(599),
  checkedAt: z.string().datetime(),
  title: z.string().max(1000),
  headings: z.array(z.string().max(1000)).max(8),
  text: z.string().max(100_000),
  structured: z.array(z.string().max(20_000)).max(12),
  selected: z.array(z.string().max(1000)).max(20),
  locale: z.string().max(100),
  screenshot: z.string().max(1_000_000),
});

/** Fixed read-only program: URLs are serialized data, never provider- or model-generated code. */
export const browserInspectionCode = (url: string) => `
const target = ${JSON.stringify(url)};
const origin = new URL(target).origin;
// Interact evaluates through Node's inspector, which has no dynamic-import callback.
const dns = typeof process.getBuiltinModule === "function"
  ? process.getBuiltinModule("dns")
  : typeof require === "function" ? require("node:dns") : null;
if (!dns?.promises?.lookup) throw new Error("Browser runtime cannot validate public hosts");
const lookup = dns.promises.lookup;
const hosts = new Map();
const publicAddress = (address) => {
  if (address.includes(":")) return /^[23]/i.test(address) && !/^2001:db8:/i.test(address);
  return !/^(?:0|10|127|169\\.254|192\\.168|172\\.(?:1[6-9]|2[0-9]|3[01])|100\\.(?:6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])|192\\.0\\.0|198\\.(?:18|19)|22[4-9]|23[0-9]|24[0-9]|25[0-5])\\./.test(address);
};
await page.route("**/*", async (route) => {
  const request = route.request();
  const address = new URL(request.url());
  if (!["GET", "HEAD"].includes(request.method()) || address.protocol !== "https:" || address.port || address.username || address.password || (request.isNavigationRequest() && address.origin !== origin)) return route.abort();
  if (!hosts.has(address.hostname)) hosts.set(address.hostname, Promise.race([
    lookup(address.hostname, { all: true }).then((records) => records.length > 0 && records.every((record) => publicAddress(record.address))).catch(() => false),
    new Promise((resolve) => setTimeout(() => resolve(false), 1500))
  ]));
  return (await hosts.get(address.hostname)) ? route.continue() : route.abort();
});
if (typeof page.routeWebSocket === "function") await page.routeWebSocket(/.*/, (socket) => socket.close());
await page.setViewportSize({ width: 1365, height: 900 });
const response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 18000 });
await page.waitForTimeout(1200);
const observed = await page.evaluate(() => ({
  title: document.title.slice(0, 1000),
  headings: [...document.querySelectorAll("h1")].slice(0, 8).map((node) => (node.innerText || "").slice(0, 1000)),
  text: (document.querySelector("main")?.innerText || document.body?.innerText || "").slice(0, 100000),
  structured: [...document.querySelectorAll('script[type="application/ld+json"]')].slice(0, 12).map((node) => (node.textContent || "").slice(0, 20000)),
  selected: [...document.querySelectorAll('option:checked,[aria-selected="true"],input[type="radio"]:checked')].slice(0, 20).map((node) => (node.innerText || node.getAttribute("aria-label") || node.value || "").slice(0, 1000)),
  locale: navigator.language.slice(0, 100)
}));
const screenshot = (await page.screenshot({ type: "jpeg", quality: 35, fullPage: false, timeout: 5000 })).toString("base64");
console.log(JSON.stringify({ ...observed, url: page.url(), status: response?.status() || 0, checkedAt: new Date().toISOString(), screenshot }));
`;

const normalize = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();
const safe = async (url: string, dependencies: BrowserDependencies) => {
  if (!publicUrlSchema.safeParse(url).success) return false;
  const controller = new AbortController();
  const checked = await resultify(() =>
    Promise.race([
      (dependencies.safeUrl ?? isSafePublicHttpUrl)(url, { allowLocal: false }),
      delay(3000, false, { signal: controller.signal }),
    ]),
  );
  controller.abort();
  return checked.success && checked.data;
};

export const inspectPages = async (
  {
    apiKey,
    product,
    answer: input,
    competitorUrls,
    country,
    deadline: supplied,
  }: {
    apiKey: string;
    product: { name: string; url: string };
    answer: AiCapture;
    competitorUrls?: string[];
    country: string;
    deadline?: number;
  },
  dependencies: BrowserDependencies = {},
): Promise<Result<BrowserResearch, IntegrationError>> => {
  const now = dependencies.now ?? Date.now;
  const deadline = Math.min(supplied ?? now() + 115_000, now() + 115_000);
  const sources: Source[] = [];
  const raw: RawCapture[] = [];
  const held = (reason: string): Result<BrowserResearch, IntegrationError> => ({
    success: true,
    data: { status: "held", reason, sources, raw },
  });
  const answer = aiCaptureSchema.safeParse(input);
  if (!keyValid(apiKey))
    return {
      success: false,
      error: new IntegrationError(
        "firecrawl",
        "configuration",
        "Save a Firecrawl API key before browser research.",
        409,
      ),
    };
  if (
    !answer.success ||
    product.url !== answer.data.job.query.product.url ||
    product.name !== answer.data.job.query.product.name ||
    country !== answer.data.job.query.country ||
    !/^[A-Z]{2}$/.test(country)
  )
    return {
      success: false,
      error: new IntegrationError(
        "firecrawl",
        "input",
        "Browser research must match the product and country of the captured shopper query.",
        422,
      ),
    };
  if (deadline <= now() || !(await safe(product.url, dependencies)))
    return held(
      "The product URL is not a permitted public page or the research time budget has ended.",
    );
  const read = async (url: string, limit: number) => {
    const timeout = Math.min(8000, deadline - now());
    if (timeout <= 0) return null;
    const response = await (dependencies.page ?? HTTP.page)(url, {
      timeout,
      limit,
      strictGuard: true,
    });
    if (!response.success) return null;
    const receipt: RawCapture = {
      url: response.data.url,
      status: response.data.status,
      receivedAt: new Date(now()).toISOString(),
      body: response.data.body,
      sha256: digest(response.data.body),
    };
    raw.push(receipt);
    return { page: response.data, receipt };
  };
  const allowed = async (url: string) => {
    if (!(await safe(url, dependencies))) return null;
    const origin = new URL(url).origin;
    const robots = await read(`${origin}/robots.txt`, 200_000);
    if (
      !robots ||
      new URL(robots.page.url).origin !== origin ||
      ![200, 404].includes(robots.page.status)
    )
      return null;
    if (
      robots.page.status === 200 &&
      blockedByRobots(
        robots.page.body,
        new URL(url).pathname + new URL(url).search,
      )
    )
      return null;
    return robots;
  };
  const robots = await allowed(product.url);
  if (!robots)
    return held(
      "The merchant's robots rules or access response do not permit product inspection.",
    );
  const origin = new URL(product.url).origin;
  const ucpUrl = `${origin}/.well-known/ucp`;
  if (
    robots.page.status === 200 &&
    blockedByRobots(robots.page.body, "/.well-known/ucp")
  )
    return held(
      "The merchant's robots rules do not permit the required UCP check.",
    );
  const profile = await read(ucpUrl, 200_000);
  if (!profile || profile.page.url !== ucpUrl)
    return held(
      "The merchant's UCP endpoint could not be captured at its stated URL.",
    );
  const profileSource: Source = {
    id: "ucp",
    kind: "ucp",
    url: ucpUrl,
    capture: "http",
    checkedAt: profile.receipt.receivedAt,
    content: `HTTP ${profile.page.status}\n${profile.page.body}`.slice(
      0,
      18000,
    ),
    artifact: `sha256:${profile.receipt.sha256}`,
  };
  sources.push(profileSource);
  const parsedProfile = resultify(
    () => JSON.parse(profile.page.body) as unknown,
  );
  const ucpProfile = parsedProfile.success
    ? z
        .object({
          ucp: z.object({ capabilities: z.record(z.string(), z.unknown()) }),
        })
        .safeParse(parsedProfile.data)
    : null;
  const capabilities = ucpProfile?.success
    ? Object.keys(ucpProfile.data.ucp.capabilities).slice(0, 50)
    : [];
  const access = classifyPageAccess(profile.page);
  const ucp = {
    url: ucpUrl,
    status:
      profile.page.status === 200 && capabilities.length
        ? ("present" as const)
        : profile.page.status === 404
          ? ("notObserved" as const)
          : access.kind === "challenged"
            ? ("blocked" as const)
            : ("unknown" as const),
    httpStatus: profile.page.status,
    capabilities,
    sourceIds: [profileSource.id],
  };

  const creation = await providerJson(
    "firecrawl",
    `${HOST}/interact`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ttl: 120,
        activityTtl: 45,
        blockAds: false,
        location: { country },
      }),
    },
    { deadline, billable: true },
    dependencies,
  );
  if (!creation.success) return creation;
  const session = z
    .object({ success: z.literal(true), id: z.string().uuid() })
    .safeParse(creation.data.value);
  if (!session.success)
    return {
      success: false,
      error: new IntegrationError(
        "firecrawl",
        "uncertain",
        "The provider did not return a usable browser session. Its TTL will expire; do not create another session automatically.",
        502,
        null,
        null,
        { response: creation.data.raw },
      ),
    };
  const candidates: Extract<
    BrowserResearch,
    { status: "captured" }
  >["candidates"] = [];
  const limitations: string[] = [
    "A fresh provider browser inspected public pages without signing in. No cart, checkout, purchase or form submission was performed. Country is requested routing; market and availability are not established by routing alone.",
    "The browser allowed only GET and HEAD requests and blocked cross-origin navigation. Features requiring other network methods were not exercised; missing content under these restrictions is not evidence of a merchant defect.",
  ];
  const inspect = async (url: string, id: string) => {
    if (deadline - now() < 25_000) return null;
    const execution = await providerJson(
      "firecrawl",
      `${HOST}/interact/${session.data.id}/execute`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language: "node",
          timeout: 30,
          code: browserInspectionCode(url),
        }),
      },
      { deadline, billable: true },
      dependencies,
    );
    if (!execution.success) throw execution.error;
    raw.push(execution.data.raw);
    const envelope = z
      .object({
        success: z.literal(true),
        stdout: z.string().nullish(),
        result: z.string().nullish(),
        error: z.string().nullish(),
        killed: z.boolean().optional(),
        exitCode: z.number().nullish(),
      })
      .safeParse(execution.data.value);
    if (
      !envelope.success ||
      envelope.data.error ||
      envelope.data.killed ||
      (envelope.data.exitCode !== undefined &&
        envelope.data.exitCode !== null &&
        envelope.data.exitCode !== 0)
    )
      return null;
    const content = resultify(
      () =>
        JSON.parse(
          envelope.data.stdout || envelope.data.result || "",
        ) as unknown,
    );
    const rendered = content.success
      ? renderedSchema.safeParse(content.data)
      : null;
    if (
      !rendered?.success ||
      new URL(rendered.data.url).origin !== new URL(url).origin ||
      rendered.data.url !== url ||
      rendered.data.status < 200 ||
      rendered.data.status >= 300 ||
      !rendered.data.text.trim() ||
      Date.parse(rendered.data.checkedAt) <
        Date.parse(creation.data.raw.receivedAt) - 60_000 ||
      Date.parse(rendered.data.checkedAt) > now() + 60_000 ||
      /(?:just a moment|verify (?:you are|you're) human|access denied|sign in to continue|password protected)/i.test(
        `${rendered.data.title} ${rendered.data.text.slice(0, 500)}`,
      )
    )
      return null;
    const visible = [
      rendered.data.title,
      ...rendered.data.headings,
      ...rendered.data.selected,
      rendered.data.text,
    ].join("\n");
    if (
      id === "product-browser" &&
      !normalize(visible).includes(normalize(product.name))
    )
      return null;
    const source: Source = {
      id,
      kind: id === "product-browser" ? "product" : "competitor",
      capture: "browser",
      url: rendered.data.url,
      checkedAt: rendered.data.checkedAt,
      content: `${visible.slice(0, 12000)}\nRendered product data:\n${rendered.data.structured.join("\n").slice(0, 5500)}`,
      artifact: `sha256:${execution.data.raw.sha256}`,
    };
    sources.push(source);
    return { source, rendered: rendered.data };
  };

  // Await cleanup even when browser execution throws. TTL is the backstop if deletion cannot reach the provider.
  const inspected = await resultify(async (): Promise<BrowserResearch> => {
    const merchant = await inspect(product.url, "product-browser");
    if (!merchant)
      return {
        status: "held",
        reason:
          "The merchant product could not be verified in the rendered browser capture.",
        sources,
        raw,
      };
    const requested =
      competitorUrls ?? answer.data.links.map((entry) => entry.url);
    const linked = new Set(answer.data.links.map((entry) => entry.url));
    const targets = [...new Set(requested)]
      .filter((url) => {
        if (!linked.has(url) || !publicUrlSchema.safeParse(url).success)
          return false;
        const address = new URL(url);
        return (
          address.origin !== origin &&
          address.pathname !== "/" &&
          address.pathname !== "/goto" &&
          !/(?:^|\.)(?:google\.[a-z.]+|chatgpt\.com|openai\.com|scrapellm\.com|firecrawl\.dev)$/.test(
            address.hostname,
          )
        );
      })
      .slice(0, 2);
    for (const [index, target] of targets.entries()) {
      const permitted = await allowed(target);
      if (!permitted) {
        limitations.push(
          `A cited comparison page could not be inspected under its robots rules: ${target}`,
        );
        continue;
      }
      const comparison = await inspect(
        target,
        `competitor-browser-${index + 1}`,
      );
      if (!comparison) {
        limitations.push(
          `The cited comparison page did not produce a verified rendered capture: ${target}`,
        );
        continue;
      }
      const name =
        comparison.rendered.headings.find((heading) => heading.trim()) ??
        comparison.rendered.title;
      if (name.trim())
        candidates.push({
          name: new URL(target).hostname,
          product: name.slice(0, 300),
          url: target,
          sourceIds: [comparison.source.id],
        });
    }
    return {
      status: "captured",
      sources,
      ucp,
      checkout: {
        status: "notTested",
        sourceIds: [],
        notes:
          "Read-only product inspection. No cart or checkout transition was attempted.",
      },
      raw,
      candidates,
      limitations,
    };
  });
  const cleanup = await providerJson(
    "firecrawl",
    `${HOST}/interact/${session.data.id}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    { deadline: now() + 5000 },
    dependencies,
  );
  if (!cleanup.success)
    limitations.push(
      "The browser deletion could not be confirmed; its 120-second lifetime remains the cleanup backstop.",
    );
  if (!inspected.success)
    return inspected.error instanceof IntegrationError
      ? { success: false, error: inspected.error }
      : held(
          "Browser research was interrupted; its session was closed or left to expire under its short lifetime.",
        );
  const validated = browserResearchSchema.safeParse(inspected.data);
  return validated.success
    ? { success: true, data: validated.data }
    : held("The browser evidence did not pass the capture contract.");
};
