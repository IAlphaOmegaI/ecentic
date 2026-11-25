import { resultify } from "@zenncore/utils";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { type DefaultTreeAdapterTypes, parse } from "parse5";
import { normalizeDomain } from "@/lib/outbound";
import * as HTTP from "@/server/utils/http";
import { classifyPageAccess } from "./evidence/bot-challenge";
import { blockedByRobots } from "./research";

const PRODUCT_PATH = /\/(?:products?|p|item|shop)\/[^/]+/i;
const GIFT_CARD_PATH = /(?:^|[-_/])(?:e[-_]?)?gift[-_]?cards?(?=$|[-_/])/i;
const NON_PHYSICAL_PATH =
  /(?:^|[-_/])(?:(?:virtual|online)[-_](?:consultations?|appointments?)|digital[-_](?:downloads?|vouchers?)|e[-_]?books?)(?=$|[-_/])/i;

export const isGiftCardProductCandidate = (url: string) => {
  const pathname = new URL(url).pathname;
  return PRODUCT_PATH.test(pathname) && GIFT_CARD_PATH.test(pathname);
};

/** Navigation candidates only; a permitted URL still needs priced own-product evidence. */
export const isPhysicalProductCandidate = (url: string) => {
  const pathname = new URL(url).pathname;
  return (
    PRODUCT_PATH.test(pathname) &&
    !GIFT_CARD_PATH.test(pathname) &&
    !NON_PHYSICAL_PATH.test(pathname)
  );
};
const elements = (
  node: DefaultTreeAdapterTypes.Node,
): DefaultTreeAdapterTypes.Element[] => [
  ...("tagName" in node ? [node] : []),
  ...("childNodes" in node ? node.childNodes.flatMap(elements) : []),
];
const canonical = (value: string, origin: string) => {
  const parsed = resultify(() => new URL(value, origin));
  if (
    !parsed.success ||
    parsed.data.origin !== origin ||
    parsed.data.username ||
    parsed.data.password ||
    parsed.data.port
  )
    return null;
  return `${parsed.data.origin}${parsed.data.pathname}`;
};
export const productLinks = (body: string, origin: string) =>
  [
    ...new Set(
      elements(parse(body))
        .filter((node) => node.tagName === "a")
        .flatMap((node) => {
          const href = node.attrs.find(
            (attribute) => attribute.name === "href",
          )?.value;
          const url = href ? canonical(href, origin) : null;
          return url && isPhysicalProductCandidate(url) ? [url] : [];
        }),
    ),
  ].slice(0, 8);

export const sitemapLinks = (body: string, origin: string): string[] => {
  if (XMLValidator.validate(body) !== true) return [];
  const parsed = resultify(
    () =>
      new XMLParser({ ignoreAttributes: true, processEntities: false }).parse(
        body,
      ) as unknown,
  );
  if (!parsed.success) return [];
  const locations = (node: unknown, depth = 0): string[] => {
    if (depth > 8 || !node || typeof node !== "object") return [];
    if (Array.isArray(node))
      return node
        .slice(0, 5000)
        .flatMap((child) => locations(child, depth + 1));
    return Object.entries(node).flatMap(([key, value]) =>
      key === "loc" && typeof value === "string"
        ? [value.replaceAll("&amp;", "&")]
        : locations(value, depth + 1),
    );
  };
  return [
    ...new Set(
      locations(parsed.data).flatMap((location) => {
        const url = canonical(location, origin);
        return url ? [url] : [];
      }),
    ),
  ];
};

/** At most six public reads, no paid crawler, no fallback around a blocked response. */
export const discover = async ({
  website,
  deadline = Date.now() + 60000,
}: {
  website: string;
  deadline?: number;
}) => {
  const parsed = resultify(() => new URL(website));
  const empty = (reason: string) => ({
    urls: [] as string[],
    status: "hold" as const,
    reason,
    checkedAt: new Date().toISOString(),
  });
  if (
    !parsed.success ||
    parsed.data.protocol !== "https:" ||
    parsed.data.username ||
    parsed.data.password ||
    parsed.data.port
  )
    return empty("Use a public HTTPS storefront URL.");
  const robots = await HTTP.page(new URL("/robots.txt", parsed.data).href, {
    strictGuard: true,
    timeout: 10000,
    limit: 200000,
    accept: "text/plain",
  });
  if (!robots.success || ![200, 404].includes(robots.data.status))
    return empty("The storefront's access rules could not be read.");
  if (normalizeDomain(robots.data.url) !== normalizeDomain(website))
    return empty("The storefront redirected to another company.");
  const origin = new URL(robots.data.url).origin;
  const rules = robots.data.status === 200 ? robots.data.body : "";
  const state = { reads: 1, stopped: false };
  const read = async (url: string) => {
    if (
      state.stopped ||
      state.reads >= 6 ||
      Date.now() >= deadline ||
      new URL(url).origin !== origin ||
      blockedByRobots(rules, new URL(url).pathname)
    )
      return null;
    state.reads += 1;
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const page = await HTTP.page(url, {
      strictGuard: true,
      timeout: 10000,
      limit: 1000000,
    });
    if (!page.success) {
      state.stopped = true;
      return null;
    }
    if (new URL(page.data.url).origin !== origin) {
      state.stopped = true;
      return null;
    }
    if (page.data.status === 404) return null;
    if (
      classifyPageAccess(page.data).kind !== "ok" ||
      /^\/password\/?$/i.test(new URL(page.data.url).pathname) ||
      [401, 403, 429, 503].includes(page.data.status)
    ) {
      state.stopped = true;
      return null;
    }
    return page.data.status === 200 ? page.data : null;
  };
  const home = await read(origin);
  if (!home)
    return empty(
      "The storefront could not be read without an access restriction.",
    );
  const urls = productLinks(home.body, origin).filter(
    (url) => !blockedByRobots(rules, new URL(url).pathname),
  );
  if (urls.length >= 8)
    return {
      urls,
      status: "found" as const,
      reason: null,
      checkedAt: new Date().toISOString(),
    };
  const maps = [
    ...new Set(
      [...rules.matchAll(/^\s*sitemap:\s*(\S+)/gim)]
        .flatMap((match) => {
          const url = canonical(match[1] ?? "", origin);
          return url ? [url] : [];
        })
        .concat([`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`]),
    ),
  ].slice(0, 2);
  for (const map of maps) {
    const page = await read(map);
    if (state.stopped)
      return empty(
        "The storefront restricted a discovery request. Review it manually.",
      );
    if (!page) continue;
    const links = sitemapLinks(page.body, origin);
    urls.push(...links.filter(isPhysicalProductCandidate));
    for (const nested of links
      .filter((url) => /\.xml$/i.test(new URL(url).pathname))
      .sort(
        (first, second) =>
          Number(/product/i.test(second)) - Number(/product/i.test(first)),
      )
      .slice(0, 2)) {
      if (urls.length >= 8) break;
      const child = await read(nested);
      if (state.stopped)
        return empty(
          "The storefront restricted a sitemap request. Review it manually.",
        );
      if (child)
        urls.push(
          ...sitemapLinks(child.body, origin).filter(
            isPhysicalProductCandidate,
          ),
        );
    }
    if (urls.length >= 8) break;
  }
  const found = [...new Set(urls)]
    .filter((url) => !blockedByRobots(rules, new URL(url).pathname))
    .slice(0, 8);
  return found.length
    ? {
        urls: found,
        status: "found" as const,
        reason: null,
        checkedAt: new Date().toISOString(),
      }
    : empty(
        "No permitted product URLs were found within this bounded storefront check.",
      );
};
