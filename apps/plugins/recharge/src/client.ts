import {
  identifier,
  RechargeError,
  type RechargeFetch,
  readResponse,
  record,
  send,
} from "./http";
import { retryDelay } from "./limiter";
import type { RechargePlan, RechargeProduct } from "./offers";
import type { RechargeOrder, RechargeSubscription } from "./webhooks";

export type RechargeStore = {
  id?: string | number;
  external_platform?: string;
  external_platform_domain?: string | null;
  platform_domain?: string | null;
  storefront_domain?: string | null;
  identifier?: string;
  currency?: string;
};

export type RechargeWebhook = {
  id: string | number;
  topic: string;
  address: string;
  version?: string;
};

export type Page<T> = { items: T[]; nextCursor: string | null };
export type ListQuery = {
  cursor?: string | null;
  limit?: number;
  updated_at_min?: string;
  created_at_min?: string;
  external_order_id?: string;
  external_product_id?: string;
  customer_id?: string;
  status?: string;
  type?: "checkout" | "recurring";
};

export type RechargeClientOptions = {
  getAccessToken: () => Promise<string>;
  refreshAccessToken?: () => Promise<string>;
  /** Must atomically reserve against the same persisted shop bucket across workers. */
  beforeRequest: () => Promise<void>;
  fetch?: RechargeFetch;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
  maxRetries?: number;
};

const queryString = (query: ListQuery = {}) => {
  const limit = Math.min(250, Math.max(1, Math.floor(query.limit ?? 250)));
  // Recharge encodes the initial filters into its cursor. Re-sending them is invalid.
  const values = query.cursor
    ? { cursor: query.cursor, limit }
    : { ...query, cursor: undefined, limit };
  return new URLSearchParams(
    Object.entries(values).flatMap(([key, value]) =>
      value === undefined || value === null ? [] : [[key, String(value)]],
    ),
  ).toString();
};

const resourceId = (id: string | number) => {
  const value = identifier(id);
  if (!value) throw new RechargeError("Recharge resource ID is invalid.");
  return value;
};

export const createRechargeClient = ({
  getAccessToken,
  refreshAccessToken,
  beforeRequest,
  fetch: transport = fetch,
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  random = Math.random,
  now = Date.now,
  maxRetries = 4,
}: RechargeClientOptions) => {
  const request = async (
    path: string,
    options: RequestInit = {},
    attempt = 0,
    refreshed = false,
    accessToken?: string,
  ): Promise<Response> => {
    const token = accessToken ?? (await getAccessToken());
    await beforeRequest();
    const response = await send(
      transport,
      `https://api.rechargeapps.com${path}`,
      {
        ...options,
        headers: {
          "X-Recharge-Version": "2021-11",
          "X-Recharge-Access-Token": token,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
      },
    );
    if (response.status === 401 && !refreshed && refreshAccessToken) {
      await response.body?.cancel();
      const replacement = await refreshAccessToken();
      return request(path, options, attempt, true, replacement);
    }
    if (response.status === 429 && attempt < maxRetries) {
      const delay = retryDelay(attempt, response.headers.get("Retry-After"), {
        now: now(),
        random,
      });
      await response.body?.cancel();
      await sleep(delay);
      return request(path, options, attempt + 1, refreshed, accessToken);
    }
    if (!response.ok)
      throw new RechargeError(
        "Recharge could not complete this request.",
        response.status,
      );
    return response;
  };

  const list = async <T>(
    resource: string,
    query?: ListQuery,
  ): Promise<Page<T>> => {
    const data = await readResponse(
      await request(`/${resource}?${queryString(query)}`),
    );
    if (!Array.isArray(data[resource]))
      throw new RechargeError("Recharge returned an invalid list response.");
    return {
      items: data[resource] as T[],
      nextCursor:
        typeof data["next_cursor"] === "string" && data["next_cursor"]
          ? data["next_cursor"]
          : null,
    };
  };

  return {
    getStore: async (): Promise<RechargeStore> => {
      const data = await readResponse(await request("/store"));
      if (!data["store"] || typeof data["store"] !== "object")
        throw new RechargeError("Recharge returned an invalid store response.");
      return record(data["store"]) as RechargeStore;
    },
    getSubscription: async (
      id: string | number,
    ): Promise<RechargeSubscription> => {
      const data = await readResponse(
        await request(`/subscriptions/${resourceId(id)}`),
      );
      if (!data["subscription"] || typeof data["subscription"] !== "object")
        throw new RechargeError(
          "Recharge returned an invalid subscription response.",
        );
      return record(data["subscription"]) as RechargeSubscription;
    },
    listProducts: (query?: ListQuery) =>
      list<RechargeProduct>("products", query),
    listPlans: (query?: ListQuery) => list<RechargePlan>("plans", query),
    listOrders: (query?: ListQuery) => list<RechargeOrder>("orders", query),
    listSubscriptions: (query?: ListQuery) =>
      list<RechargeSubscription>("subscriptions", query),
    listWebhooks: (query?: ListQuery) =>
      list<RechargeWebhook>("webhooks", query),
    // Subscription/order/product writes are intentionally absent. These methods
    // manage delivery infrastructure and require only the topic's read scope.
    createWebhook: async ({
      topic,
      address,
    }: {
      topic: string;
      address: string;
    }) => {
      const data = await readResponse(
        await request("/webhooks", {
          method: "POST",
          body: JSON.stringify({ topic, address, version: "2021-11" }),
        }),
      );
      return record(data["webhook"]) as RechargeWebhook;
    },
    deleteWebhook: async (id: string | number) => {
      await request(`/webhooks/${resourceId(id)}`, { method: "DELETE" });
    },
  };
};

export type RechargeClient = ReturnType<typeof createRechargeClient>;

export async function* paginate<T>(
  load: (query: ListQuery) => Promise<Page<T>>,
  query: ListQuery = {},
): AsyncGenerator<T[]> {
  const state = { cursor: query.cursor ?? null };
  const cursors = new Set<string>();
  do {
    const page = await load({ ...query, cursor: state.cursor });
    yield page.items;
    if (page.nextCursor && cursors.has(page.nextCursor))
      throw new RechargeError("Recharge repeated a pagination cursor.");
    if (page.nextCursor) cursors.add(page.nextCursor);
    state.cursor = page.nextCursor;
  } while (state.cursor);
}
