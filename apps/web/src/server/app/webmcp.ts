"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { Outcome } from "@/lib/webmcp";
import { withAuthentication } from "../utils/authentication";
import { withContext } from "../utils/context";
import { Environment } from "../utils/environment";
import { normalizeScanUrl, scanWebsite } from "../utils/webmcp";
import { consumeScan } from "../utils/webmcp-rate-limit";
import * as Store from "./store";

const input = z.object({ url: z.string().trim().min(1).max(2048) });
const storeInput = input.extend({ store: z.string().min(1).max(128) });

const run = async (url: string): Promise<{ success: true; data: Outcome }> => {
  const verdict = await consumeScan({ headers: await headers() });
  if (!verdict.allowed)
    return {
      success: true,
      data: { kind: "limited", retryAfter: verdict.reset },
    };
  return { success: true, data: await scanWebsite(url) };
};

/** Free, anonymous and read-only. The dashboard calls the same scan engine. */
export const scan = withContext(async (_, values: { url: string }) => {
  const parsed = input.safeParse(values);
  if (!parsed.success)
    return { success: true, data: { kind: "invalid" } } as const;
  return run(parsed.data.url);
}, "WebMCP.scan");

export const scanStore = withAuthentication(
  async (_, values: { store: string; url: string }) => {
    const parsed = storeInput.safeParse(values);
    if (!parsed.success)
      return { success: true, data: { kind: "invalid" } } as const;

    const store = await Store.resolveForUser(Environment.SERVER, {
      store: parsed.data.store,
    });
    if (!store.success) return store;
    const target = normalizeScanUrl(parsed.data.url);
    const origins = [
      store.data.domain,
      ...(store.data.storefrontHosts ?? []),
    ].flatMap((domain) => {
      const normalized = normalizeScanUrl(domain);
      return normalized ? [new URL(normalized).origin] : [];
    });
    if (!target || !origins.includes(new URL(target).origin))
      return { success: true, data: { kind: "invalid" } } as const;

    return run(target);
  },
  "WebMCP.scanStore",
);
