import "server-only";

import { createHash } from "node:crypto";
import { type Result, resultify } from "@zenncore/utils";
import * as HTTP from "@/server/utils/http";
import { IntegrationError, retryAfter } from "./http";
import type { RawCapture } from "./live-shopping-contract";

export type Dependencies = {
  request?: typeof HTTP.request;
  now?: () => number;
};
export const digest = (body: string) =>
  createHash("sha256").update(body).digest("hex");
export const keyValid = (key: string) =>
  key.length >= 8 && key.length <= 4096 && !/\s/.test(key);

/** Provider hosts are constants at call sites. Never attach a key to response URLs. */
export const providerJson = async (
  provider: "scrapellm" | "firecrawl",
  url: string,
  options: RequestInit,
  {
    deadline,
    billable = false,
  }: { deadline?: number; billable?: boolean } = {},
  dependencies: Dependencies = {},
): Promise<Result<{ value: unknown; raw: RawCapture }, IntegrationError>> => {
  const now = dependencies.now ?? Date.now;
  const timeout = Math.min(35_000, (deadline ?? now() + 35_000) - now());
  if (timeout <= 0)
    return {
      success: false,
      error: new IntegrationError(
        provider,
        "unavailable",
        "The research time budget has ended.",
        504,
      ),
    };

  const response = await (dependencies.request ?? HTTP.request)(
    url,
    {
      ...options,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    },
    { timeout },
  );
  if (!response.success)
    return {
      success: false,
      error: new IntegrationError(
        provider,
        billable ? "uncertain" : "unavailable",
        billable
          ? "The research request was interrupted. It may have started; do not submit it again automatically."
          : "The research provider could not be reached.",
      ),
    };

  const read = await HTTP.read(response.data, { limit: 2_000_000 });
  const raw = read.success
    ? {
        url,
        status: response.data.status,
        receivedAt: new Date(now()).toISOString(),
        body: read.data,
        sha256: digest(read.data),
      }
    : null;
  if (!response.data.ok) {
    const status = response.data.status;
    const code = (() => {
      switch (true) {
        case status === 401 || status === 403:
          return "access";
        case status === 402:
          return "quota";
        case status === 429:
          return "rate-limit";
        case status >= 500 && billable:
          return "uncertain";
        case status >= 500 || status === 404:
          return "unavailable";
        default:
          return "input";
      }
    })();
    return {
      success: false,
      error: new IntegrationError(
        provider,
        code,
        `${provider} returned HTTP ${status}.`,
        status,
        retryAfter(response.data.headers.get("retry-after"), now()),
        null,
        raw ? { response: raw } : null,
      ),
    };
  }
  if (!raw)
    return {
      success: false,
      error: new IntegrationError(
        provider,
        billable ? "uncertain" : "unavailable",
        "The provider response was incomplete or exceeded the capture limit.",
      ),
    };
  const parsed = resultify(() => JSON.parse(raw.body) as unknown);
  if (!parsed.success)
    return {
      success: false,
      error: new IntegrationError(
        provider,
        billable ? "uncertain" : "contract",
        "The provider returned an unreadable response.",
        502,
        null,
        null,
        { response: raw },
      ),
    };
  return { success: true, data: { value: parsed.data, raw } };
};
