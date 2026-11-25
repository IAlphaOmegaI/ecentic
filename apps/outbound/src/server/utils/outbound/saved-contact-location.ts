import { createHash } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import { normalizeDomain } from "@/lib/outbound";
import { ValidationError } from "@/server/utils/error";
import * as HTTP from "@/server/utils/http";
import type { SourceReceipt } from "./automation-qualification";
import { classifyPageAccess } from "./evidence/bot-challenge";
import { jsonLdBlocks } from "./evidence/product-schema";
import { blockedByRobots } from "./research";

type Node = DefaultTreeAdapterTypes.Node;
const children = (node: Node): Node[] =>
  "childNodes" in node ? node.childNodes : [];
const visible = (node: Node): string => {
  if (node.nodeName === "#text" && "value" in node) return node.value;
  if (
    ["script", "style", "template", "noscript"].includes(node.nodeName) ||
    ("attrs" in node &&
      node.attrs.some(
        ({ name, value }) =>
          name === "hidden" ||
          (name === "aria-hidden" && value === "true") ||
          (name === "style" &&
            /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)/i.test(
              value,
            )),
      ))
  )
    return "";
  return children(node).map(visible).join(" ");
};
const links = (node: Node): string[] => [
  ...("attrs" in node && node.nodeName === "a"
    ? node.attrs.filter(({ name }) => name === "href").map(({ value }) => value)
    : []),
  ...children(node).flatMap(links),
];
const addresses = (input: unknown, depth = 0): string[] => {
  if (depth > 8 || !input || typeof input !== "object") return [];
  if (Array.isArray(input))
    return input.slice(0, 100).flatMap((item) => addresses(item, depth + 1));
  const record = input as Record<string, unknown>;
  if (record["@type"] === "PostalAddress") return [JSON.stringify(record)];
  return Object.values(record)
    .slice(0, 100)
    .flatMap((item) => addresses(item, depth + 1));
};
const excerpt = (body: string, document: Node) => {
  const structured = jsonLdBlocks(body).flatMap((block) => {
    const parsed = resultify(() => JSON.parse(block) as unknown);
    return parsed.success ? addresses(parsed.data) : [];
  });
  const text = visible(document).replace(/\s+/g, " ").trim();
  return [...structured, text].join("\n").slice(0, 18000);
};

/** Free address collection, with the same public-page guards as product research. */
export const collectLocationReceipts = (input: {
  website: string;
  deadline: number;
  existing?: SourceReceipt[];
}): Promise<Result<SourceReceipt[], Error>> =>
  resultify(async () => {
    const location = new URL(input.website);
    if (
      location.protocol !== "https:" ||
      location.port ||
      location.username ||
      location.password
    )
      throw new ValidationError("A public HTTPS company website is required.");
    const receipts = [...(input.existing ?? [])];
    const deadline = Math.min(input.deadline, Date.now() + 40000);
    const timeout = () => Math.max(1, Math.min(8000, deadline - Date.now()));
    if (!Number.isFinite(deadline) || Date.now() + 1000 >= deadline)
      return receipts;
    const robots = await HTTP.page(new URL("/robots.txt", location).href, {
      strictGuard: true,
      timeout: timeout(),
      limit: 200000,
      accept: "text/plain",
    });
    if (
      !robots.success ||
      ![200, 404].includes(robots.data.status) ||
      new URL(robots.data.url).protocol !== "https:" ||
      normalizeDomain(robots.data.url) !== normalizeDomain(location.hostname) ||
      (robots.data.status === 200 &&
        classifyPageAccess(robots.data).kind !== "ok")
    )
      return receipts;
    const origin = new URL(robots.data.url).origin;
    const rules = robots.data.status === 200 ? robots.data.body : "";
    const state = { stopped: false };
    const visited = new Set<string>();
    const read = async (url: string) => {
      const path = new URL(url);
      if (
        state.stopped ||
        visited.has(path.href) ||
        path.origin !== origin ||
        Date.now() + 1000 >= deadline
      )
        return null;
      if (blockedByRobots(rules, `${path.pathname}${path.search}`)) {
        state.stopped = true;
        return null;
      }
      visited.add(path.href);
      const response = await HTTP.page(path.href, {
        strictGuard: true,
        timeout: timeout(),
        limit: 2000000,
        accept: "text/html",
      });
      if (!response.success) {
        state.stopped = true;
        return null;
      }
      const page = response.data;
      if (
        new URL(page.url).origin !== origin ||
        classifyPageAccess(page).kind === "challenged" ||
        page.status === 401
      ) {
        state.stopped = true;
        return null;
      }
      if (page.status !== 200) return null;
      const document = parse(page.body);
      receipts.push({
        kind: "company",
        url: page.url,
        checkedAt: new Date().toISOString(),
        sha256: createHash("sha256").update(page.body).digest("hex"),
        excerpt: excerpt(page.body, document),
      });
      return document;
    };
    const home = await read(`${origin}/`);
    if (!home) return receipts;
    const candidates = links(home).flatMap((href) => {
      const parsed = resultify(() => new URL(href, origin));
      if (!parsed.success) return [];
      const url = parsed.data;
      if (
        url.origin !== origin ||
        url.username ||
        url.password ||
        !/\/(?:pages\/|policies\/)?(?:contact(?:-us)?|about(?:-us)?|privacy(?:-policy)?)\/?$/i.test(
          url.pathname,
        )
      )
        return [];
      url.hash = "";
      return [url.href];
    });
    const pages = [
      ...new Set([
        ...candidates,
        `${origin}/pages/contact`,
        `${origin}/policies/privacy-policy`,
        `${origin}/pages/about-us`,
      ]),
    ].slice(0, 3);
    for (const page of pages) {
      if (state.stopped) break;
      await read(page);
    }
    return receipts;
  });
