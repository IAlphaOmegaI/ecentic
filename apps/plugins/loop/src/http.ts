import { resultify } from "@zenncore/utils";
import { assertMerchant, LoopError } from "./guard";
import type { LoopFetch } from "./types";

export const send = async (
  store: string,
  transport: LoopFetch,
  url: string | URL,
  options: RequestInit,
) => {
  assertMerchant(store);
  const response = await resultify(() =>
    transport(url, {
      ...options,
      redirect: "error",
      signal: options.signal ?? AbortSignal.timeout(20_000),
    }),
  );
  if (!response.success)
    throw new LoopError("The Loop request could not be completed.");
  return response.data;
};

/** Cap decoded response bytes as well as Content-Length. No provider body appears in an error. */
export const readResponse = async (
  store: string,
  response: Response,
  maximum = 8 * 1024 * 1024,
): Promise<unknown> => {
  assertMerchant(store);
  if (Number(response.headers.get("content-length")) > maximum) {
    await response.body?.cancel();
    throw new LoopError("Loop returned an oversized response.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new LoopError("Loop returned an empty response.");
  const bytes: Uint8Array[] = [];
  const size = { total: 0 };
  const reading = await resultify(async () => {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size.total += chunk.value.byteLength;
      if (size.total > maximum) {
        await reader.cancel();
        throw new LoopError("Loop returned an oversized response.");
      }
      bytes.push(chunk.value);
    }
    const body = Buffer.concat(bytes);
    return JSON.parse(body.toString("utf8")) as unknown;
  });
  reader.releaseLock();
  if (!reading.success)
    throw new LoopError("Loop returned an invalid or oversized response.");
  return reading.data;
};
