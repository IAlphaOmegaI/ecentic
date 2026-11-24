import { resultify } from "@zenncore/utils";

export type RechargeFetch = (
  input: string | URL | Request,
  options?: RequestInit,
) => Promise<Response>;

export class RechargeError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = "RechargeError";
  }
}

export const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const identifier = (value: unknown): string | null => {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
    return String(value);
  return null;
};

export const readResponse = async (response: Response) => {
  const parsing = await resultify(() => response.json() as Promise<unknown>);
  if (!parsing.success)
    throw new RechargeError(
      "Recharge returned an invalid response.",
      response.status,
    );
  return record(parsing.data);
};

export const send = async (
  transport: RechargeFetch,
  url: string | URL,
  options: RequestInit,
) => {
  const response = await resultify(() =>
    transport(url, {
      ...options,
      // An upstream redirect must never forward a shop's credentials elsewhere.
      redirect: "error",
      signal: options.signal ?? AbortSignal.timeout(20_000),
    }),
  );
  if (!response.success)
    // Do not propagate fetch URLs, authorization codes or upstream error bodies.
    throw new RechargeError("The Recharge request could not be completed.");
  return response.data;
};
