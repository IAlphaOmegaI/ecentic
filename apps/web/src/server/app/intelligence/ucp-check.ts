"use server";

import { resultify } from "@zenncore/utils";

export type UcpCheckResult = {
  domain: string;
  /** URL that was requested (HTTPS). */
  url: string;
  https: boolean;
  /** Final HTTP status after redirects, or null if the request failed. */
  httpStatus: number | null;
  /** Endpoint responded in a way we treat as “present”: 2xx, or non-2xx with a parseable JSON body (some CDNs). */
  found: boolean;
  /** Response body is valid JSON. */
  valid: boolean;
  contentType: string | null;
  data: unknown | null;
  error: string | null;
};

export const checkUcp = async (
  domain: string,
): Promise<
  { success: true; data: UcpCheckResult } | { success: false; error: string }
> => {
  const cleaned = domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!cleaned) return { success: false, error: "Please enter a domain." };

  const ucpPath = "/.well-known/ucp";
  const url = `https://${cleaned}${ucpPath}`;

  // Large retailers often serve /.well-known/ucp in a real browser but return 404 or
  // a placeholder to bots and to many datacenter IPs. Mimic a normal Chrome tab
  // (navigation-style Sec-Fetch-*). TLS fingerprint and IP still differ from a
  // desktop browser and cannot be fixed from fetch() alone.
  const result = await resultify(() =>
    fetch(url, {
      headers: {
        Accept:
          "application/json,application/xhtml+xml,text/html;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    }),
  );

  if (!result.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus: null,
        found: false,
        valid: false,
        contentType: null,
        data: null,
        error: "Could not reach the domain or /.well-known/ucp endpoint.",
      },
    };
  }

  const response = result.data;
  const httpStatus = response.status;
  const contentType = response.headers.get("content-type");

  const textResult = await resultify(() => response.text());
  if (!textResult.success) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus,
        found: false,
        valid: false,
        contentType,
        data: null,
        error: `Endpoint returned HTTP ${httpStatus} and body could not be read.`,
      },
    };
  }

  // Parse regardless of HTTP status — some CDNs (e.g. Akamai + Azure Blob)
  // serve the UCP file with a non-200 status but a valid JSON body.
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(textResult.data);
  } catch {
    // not valid JSON
  }

  const valid = parsed !== null;
  const found = response.ok || valid;

  if (valid) {
    return {
      success: true,
      data: {
        domain: cleaned,
        url,
        https: true,
        httpStatus,
        found: true,
        valid: true,
        contentType,
        data: parsed,
        error: null,
      },
    };
  }

  return {
    success: true,
    data: {
      domain: cleaned,
      url,
      https: true,
      httpStatus,
      found,
      valid: false,
      contentType,
      data: null,
      error: response.ok
        ? "Response is not valid JSON."
        : `Endpoint returned HTTP ${httpStatus} with no parseable JSON body.`,
    },
  };
};
