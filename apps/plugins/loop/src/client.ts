// biome-ignore-all lint/complexity/useLiteralKeys: Unknown provider records require bracket access under noPropertyAccessFromIndexSignature.
import { resultify } from "@zenncore/utils";
import { assertMerchant, identifier, LoopError, record, text } from "./guard";
import { readResponse, send } from "./http";
import { retryDelay } from "./limiter";
import { parseReturn } from "./returns";
import {
  LOOP_API_ORIGIN,
  LOOP_API_PREFIX,
  LOOP_STATES,
  LOOP_TRIGGERS,
  type LoopAuth,
  type LoopFetch,
  type LoopListQuery,
  type LoopOAuthAuth,
  type LoopPage,
  type LoopReservation,
  type LoopReturn,
  type LoopTrigger,
  type LoopWebhook,
} from "./types";

const LIST = `${LOOP_API_PREFIX}/warehouse/return/list`;
const DETAILS = `${LOOP_API_PREFIX}/warehouse/return/details`;
const WEBHOOKS = `${LOOP_API_PREFIX}/webhooks`;
const IDENTITY = "/api/v1/auth/me";

const providerUrl = (value: string) => {
  const parsing = resultify(() => new URL(value, LOOP_API_ORIGIN));
  if (
    !parsing.success ||
    parsing.data.origin !== LOOP_API_ORIGIN ||
    parsing.data.username ||
    parsing.data.password ||
    parsing.data.hash
  )
    throw new LoopError("Loop request destination is not allowed.");
  return parsing.data;
};

/** Every API request, including pagination/retries, passes this method + path guard. */
export const assertAllowedRequest = (
  store: string,
  method: string,
  input: string,
  ownedWebhookIds: readonly string[] = [],
) => {
  assertMerchant(store);
  const url = providerUrl(input);
  const read =
    method === "GET" &&
    [IDENTITY, LIST, DETAILS, WEBHOOKS].includes(url.pathname);
  const create = method === "POST" && url.pathname === WEBHOOKS;
  const match = new RegExp(`^${WEBHOOKS}/(\\d{1,30})$`).exec(url.pathname);
  const remove =
    method === "DELETE" && !!match?.[1] && ownedWebhookIds.includes(match[1]);
  if (!read && !create && !remove)
    throw new LoopError("Loop method or resource is not allowed.");
  return url;
};

export type LoopClientOptions = {
  store: string;
  auth: LoopAuth;
  /** Mandatory: atomically reserve in a persisted, per-store limiter shared by all workers. */
  beforeRequest: (reservation: LoopReservation) => Promise<void>;
  refresh?: (auth: LoopOAuthAuth) => Promise<LoopOAuthAuth>;
  fetch?: LoopFetch;
  wait?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  maxRetries?: number;
  ownedWebhookIds?: readonly string[];
  webhookUrl?: string;
  expectedShopId?: string;
};

export class LoopClient {
  readonly #store: string;
  readonly #options: LoopClientOptions;
  readonly #owned: Set<string>;
  #auth: LoopAuth;
  #refreshing: Promise<LoopOAuthAuth> | null = null;

  constructor(options: LoopClientOptions) {
    assertMerchant(options.store);
    if (typeof options.beforeRequest !== "function")
      throw new LoopError("Loop requires a shared merchant rate limiter.");
    if (
      options.auth.mode === "api_key"
        ? !options.auth.apiKey
        : !options.auth.accessToken ||
          !options.auth.refreshToken ||
          !Number.isFinite(options.auth.expiresAt)
    )
      throw new LoopError("Loop credentials are incomplete.");
    this.#store = options.store;
    this.#options = options;
    this.#auth = options.auth;
    this.#owned = new Set(options.ownedWebhookIds ?? []);
  }

  async #refresh() {
    if (this.#auth.mode !== "oauth" || !this.#options.refresh)
      throw new LoopError(
        "Loop authorization expired. Reconnect the integration.",
        401,
      );
    const current = this.#auth;
    this.#refreshing ??= this.#options.refresh(current);
    const refreshing = await resultify(
      () => this.#refreshing as Promise<LoopOAuthAuth>,
    );
    this.#refreshing = null;
    if (
      !refreshing.success ||
      !refreshing.data.accessToken ||
      !refreshing.data.refreshToken ||
      !Number.isFinite(refreshing.data.expiresAt) ||
      refreshing.data.expiresAt <= (this.#options.now ?? Date.now)()
    )
      throw new LoopError("Loop authorization could not be refreshed.", 401);
    this.#auth = refreshing.data;
  }

  async #request(
    path: string,
    { method = "GET", body }: { method?: string; body?: string } = {},
    attempt = 0,
    refreshed = false,
  ): Promise<Response> {
    const url = assertAllowedRequest(this.#store, method, path, [
      ...this.#owned,
    ]);
    const now = this.#options.now ?? Date.now;
    if (
      this.#auth.mode === "oauth" &&
      this.#auth.expiresAt <= now() + 60_000 &&
      !refreshed
    )
      await this.#refresh();
    // The auth endpoint consumes both the merchant API budget and the stricter auth budget.
    await this.#options.beforeRequest({
      store: this.#store,
      bucket: "api",
      limit: 300,
      interval: 60000,
    });
    if (url.pathname === IDENTITY)
      await this.#options.beforeRequest({
        store: this.#store,
        bucket: "auth",
        limit: 20,
        interval: 60000,
      });
    const response = await send(
      this.#store,
      this.#options.fetch ?? fetch,
      url,
      {
        method,
        ...(body ? { body } : {}),
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(this.#auth.mode === "api_key"
            ? { "X-Authorization": this.#auth.apiKey }
            : { Authorization: `Bearer ${this.#auth.accessToken}` }),
        },
      },
    );
    if (response.status === 401 && this.#auth.mode === "oauth" && !refreshed) {
      await response.body?.cancel();
      await this.#refresh();
      return this.#request(path, { method, body }, attempt, true);
    }
    const maximum = Math.min(4, Math.max(0, this.#options.maxRetries ?? 3));
    if (response.status === 429 && attempt < maximum) {
      const retryAfter = response.headers.get("retry-after");
      await response.body?.cancel();
      const delay = retryDelay(this.#store, attempt, retryAfter, {
        now: now(),
        random: this.#options.random,
      });
      await (
        this.#options.wait ??
        ((milliseconds) =>
          new Promise((resolve) => setTimeout(resolve, milliseconds)))
      )(delay);
      return this.#request(path, { method, body }, attempt + 1, refreshed);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new LoopError(
        "Loop could not complete this request.",
        response.status,
      );
    }
    return response;
  }

  async identity(): Promise<{ shop_id: string | null; scopes: string[] }> {
    // TODO(loop-confirm): the auth guide demonstrates Bearer auth, not API-key auth, for /auth/me.
    const source = record(
      await readResponse(this.#store, await this.#request(IDENTITY), 64 * 1024),
    );
    const scopes = source["scopes"] ?? source["scope"];
    const shop = record(source["shop"]);
    return {
      shop_id: identifier(source["shop_id"]) ?? identifier(shop["id"]),
      scopes: (typeof scopes === "string"
        ? scopes.split(/\s+/)
        : Array.isArray(scopes)
          ? scopes
          : []
      )
        .filter(
          (scope): scope is string =>
            typeof scope === "string" && scope.length < 100,
        )
        .slice(0, 100),
    };
  }

  #projection(source: unknown): LoopReturn {
    const returned = parseReturn(this.#store, source);
    if (
      this.#options.expectedShopId &&
      returned.shop_id &&
      returned.shop_id !== this.#options.expectedShopId
    )
      throw new LoopError("Loop returned data for another shop.");
    return returned;
  }

  async #page(path: string): Promise<LoopPage> {
    const url = providerUrl(path);
    if (url.pathname !== LIST)
      throw new LoopError("Loop pagination path is not allowed.");
    url.searchParams.set("paginate", "true");
    const source = record(
      await readResponse(this.#store, await this.#request(url.toString())),
    );
    if (!Array.isArray(source["returns"]) || source["returns"].length > 750)
      throw new LoopError("Loop returned an invalid returns page.");
    const next = source["nextPageUrl"];
    if (
      next !== undefined &&
      next !== null &&
      (typeof next !== "string" || !next || next.length > 8192)
    )
      throw new LoopError("Loop returned an invalid pagination URL.");
    const pagination = next ? providerUrl(next as string) : null;
    if (pagination && pagination.pathname !== LIST)
      throw new LoopError("Loop pagination path is not allowed.");
    return {
      returns: source["returns"].map((value) => this.#projection(value)),
      nextPageUrl: pagination?.toString() ?? null,
    };
  }

  async list(query: LoopListQuery): Promise<LoopPage> {
    const start = Date.parse(query.from);
    const end = Date.parse(query.to);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end - start > 120 * 86_400_000 ||
      !LOOP_STATES.includes(query.state) ||
      !["created_at", "updated_at"].includes(query.filter)
    )
      throw new LoopError(
        "Loop list requires a state and a date window of at most 120 days.",
      );
    const url = new URL(LIST, LOOP_API_ORIGIN);
    url.search = new URLSearchParams({
      from: new Date(start).toISOString(),
      to: new Date(end).toISOString(),
      filter: query.filter,
      state: query.state,
      paginate: "true",
      pageSize: String(
        Math.min(750, Math.max(1, Math.floor(query.pageSize ?? 100))),
      ),
      ...(query.cursor ? { cursor: query.cursor } : {}),
    }).toString();
    return this.#page(url.toString());
  }

  next(pageUrl: string): Promise<LoopPage> {
    return this.#page(pageUrl);
  }

  async *pages(query: LoopListQuery): AsyncGenerator<LoopReturn[]> {
    const first = await this.list(query);
    yield first.returns;
    const state = { next: first.nextPageUrl, count: 1 };
    const seen = new Set<string>();
    while (state.next) {
      if (seen.has(state.next) || state.count >= 10_000)
        throw new LoopError("Loop pagination repeated or exceeded its limit.");
      seen.add(state.next);
      const page = await this.next(state.next);
      yield page.returns;
      state.next = page.nextPageUrl;
      state.count += 1;
    }
  }

  async details(query: {
    return_id?: string;
    order_id?: string;
    order_name?: string;
  }): Promise<LoopReturn | null> {
    const values = Object.entries(query).filter(([, value]) => !!value);
    if (
      values.length !== 1 ||
      !["return_id", "order_id", "order_name"].includes(values[0]?.[0] ?? "")
    )
      throw new LoopError("Loop return lookup requires one identifier.");
    const parameters = new URLSearchParams(values as [string, string][]);
    const source = await readResponse(
      this.#store,
      await this.#request(`${DETAILS}?${parameters}`),
    );
    if (Array.isArray(source) && !source.length) return null;
    const returned = record(source);
    const error = record(returned["error"]);
    if (!returned["id"] && error["message"] === "No return found with this ID.")
      return null;
    if (returned["error"])
      throw new LoopError("Loop return lookup could not be completed.");
    return this.#projection(returned);
  }

  #callback() {
    const callback = resultify(() => new URL(this.#options.webhookUrl ?? ""));
    if (
      !callback.success ||
      callback.data.protocol !== "https:" ||
      callback.data.username ||
      callback.data.password ||
      callback.data.hash
    )
      throw new LoopError("An HTTPS Loop webhook callback is required.");
    return callback.data.toString();
  }

  #webhook(value: unknown): LoopWebhook {
    const source = record(value);
    const id = identifier(source["id"]);
    const shop = identifier(source["shop_id"]);
    if (
      !id ||
      !shop ||
      !["active", "inactive"].includes(String(source["status"]))
    )
      throw new LoopError("Loop returned an invalid webhook subscription.");
    if (this.#options.expectedShopId && shop !== this.#options.expectedShopId)
      throw new LoopError("Loop webhook belongs to another shop.");
    return {
      id,
      shop_id: shop,
      topic: text(source["topic"], 100),
      trigger: text(source["trigger"], 100),
      url: text(source["url"], 8192),
      status: source["status"] as "active" | "inactive",
    };
  }

  async webhooks(): Promise<LoopWebhook[]> {
    const callback = this.#callback();
    const source = record(
      await readResponse(this.#store, await this.#request(WEBHOOKS)),
    );
    if (
      !Array.isArray(source["webhooks"]) ||
      source["webhooks"].length > 10_000
    )
      throw new LoopError("Loop returned an invalid webhooks response.");
    return source["webhooks"]
      .filter((value) => {
        const webhook = record(value);
        return (
          webhook["url"] === callback &&
          webhook["topic"] === "return" &&
          LOOP_TRIGGERS.includes(webhook["trigger"] as LoopTrigger)
        );
      })
      .map((value) => this.#webhook(value));
  }

  async createWebhook(trigger: LoopTrigger): Promise<LoopWebhook> {
    if (!LOOP_TRIGGERS.includes(trigger))
      throw new LoopError("Loop webhook trigger is not allowed.");
    const url = this.#callback();
    const webhook = this.#webhook(
      await readResponse(
        this.#store,
        await this.#request(WEBHOOKS, {
          method: "POST",
          body: JSON.stringify({
            topic: "return",
            trigger,
            url,
            status: "active",
          }),
        }),
      ),
    );
    if (
      webhook.url !== url ||
      webhook.topic !== "return" ||
      webhook.trigger !== trigger ||
      webhook.status !== "active"
    )
      throw new LoopError(
        "Loop webhook subscription does not match the requested delivery.",
      );
    this.#owned.add(webhook.id);
    return webhook;
  }

  async deleteWebhook(id: string): Promise<void> {
    if (!identifier(id) || !this.#owned.has(id))
      throw new LoopError(
        "Only this integration's Loop webhooks may be deleted.",
      );
    const deletion = await resultify(() =>
      this.#request(`${WEBHOOKS}/${id}`, { method: "DELETE" }),
    );
    if (
      !deletion.success &&
      !(deletion.error instanceof LoopError && deletion.error.status === 404)
    )
      throw deletion.error;
    if (deletion.success) await deletion.data.body?.cancel();
    this.#owned.delete(id);
  }
}
