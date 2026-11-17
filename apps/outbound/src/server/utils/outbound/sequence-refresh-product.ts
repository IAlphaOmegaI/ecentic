import "server-only";

import { createHash } from "node:crypto";
import { resultify } from "@zenncore/utils";
import { convert } from "html-to-text";
import { normalizeDomain } from "@/lib/outbound";
import {
  type SequenceRefreshInput,
  type SequenceRefreshState,
  sameRefreshProduct,
} from "@/lib/outbound-sequence-refresh";
import * as HTTP from "@/server/utils/http";
import { inspectPublishedProduct } from "./automation-qualification";
import { classifyPageAccess } from "./evidence/bot-challenge";
import { blockedByRobots } from "./research";

type Observation = NonNullable<SequenceRefreshState["product"]>;
const unavailable = (reason: string): Observation => ({
  status: "unavailable",
  reason,
  observed: null,
  receipt: null,
});

/** Revisit the exact originally approved public URL, without searching for a replacement product. */
export const check = (
  input: SequenceRefreshInput,
  deadline = Date.now() + 25000,
) =>
  resultify(async (): Promise<Observation> => {
    const url = new URL(input.product.url);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !normalizeDomain(url.href)
    )
      return unavailable("sequence-product-url");
    const robots = await HTTP.page(new URL("/robots.txt", url).href, {
      strictGuard: true,
      timeout: 8000,
      limit: 200000,
      accept: "text/plain",
    });
    if (
      !robots.success ||
      ![200, 404].includes(robots.data.status) ||
      new URL(robots.data.url).origin !== url.origin
    )
      return unavailable("sequence-product-access");
    if (
      robots.data.status === 200 &&
      blockedByRobots(robots.data.body, `${url.pathname}${url.search}`)
    )
      return unavailable("sequence-product-access");
    if (Date.now() + 1000 >= deadline)
      return unavailable("sequence-product-timeout");
    const page = await HTTP.page(url.href, {
      strictGuard: true,
      timeout: Math.max(500, Math.min(10000, deadline - Date.now())),
      limit: 8 * 1024 * 1024,
    });
    if (
      !page.success ||
      page.data.status !== 200 ||
      page.data.url !== input.product.url ||
      classifyPageAccess(page.data).kind === "challenged"
    )
      return unavailable("sequence-product-access");
    const observed = inspectPublishedProduct(page.data, {
      name: input.product.brand,
      domain: normalizeDomain(url.href),
    });
    const receipt: NonNullable<Observation["receipt"]> = {
      url: page.data.url,
      kind: "product",
      checkedAt: new Date().toISOString(),
      sha256: createHash("sha256").update(page.data.body).digest("hex"),
      excerpt: convert(page.data.body, {
        wordwrap: false,
        selectors: [
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
        ],
      }).slice(0, 18000),
      mode: "raw-html-positive-observation",
    };
    if (!observed)
      return {
        status: "unavailable",
        reason: "sequence-product-unconfirmed",
        observed: null,
        receipt,
      };
    return sameRefreshProduct(input.product, observed)
      ? { status: "same", reason: null, observed, receipt }
      : {
          status: "changed",
          reason: "sequence-product-changed",
          observed,
          receipt,
        };
  });
