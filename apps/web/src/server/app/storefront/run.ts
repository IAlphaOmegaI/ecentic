// Deliberately NOT a "use server" module: every export of an action file is a
// public RPC door. Route handlers under /api/agents read the request and call in.

import { gunzipSync, gzipSync } from "node:zlib";
import * as Sentry from "@sentry/nextjs";
import { resultify } from "@zenncore/utils";
import { consume, type Policy } from "../../utils/rate-limit";
import { isSafePublicHttpUrl, resolveOrigin } from "../../utils/ssrf";
import type {
  Board,
  Finding,
  OfferLine,
  Prepared,
  Store,
  Summary,
} from "./catalog";
import * as ChatGPT from "./chatgpt";
import * as Google from "./google";
import * as MerchantCenter from "./merchant";
import * as Prepare from "./prepare";
import * as Read from "./read";

/**
 * One `/agents` run: read → prepare → channels, with its state in Redis because
 * a new table would mean a migration against production tonight.
 *
 * `agents:run:{id}`           Summary, what the stage screen and board poll
 * `agents:run:{id}:prepared`  Prepared[] gzipped, for the results and the feeds
 * `agents:run:{id}:store`     Store, which the feed builders need and Summary
 *                             does not carry (the return policy)
 * `agents:runs`               newest first, capped at 300
 */

const TTL = 14 * 24 * 60 * 60;
const RUNS_KEPT = 300;
const BOARD_RUNS = 30;
const LOG_KEPT = 40;
const DAILY_CAP = 300;
/**
 * Across every caller. The per-caller limit trusts a header that only Vercel's edge
 * makes honest, and a single IPv6 host can hold thousands of addresses. Past this
 * many runs in a window the day's cap would be gone in an hour either way.
 */
const BURST_LIMIT = 60;
const BURST_WINDOW = 600;
const DEDUPE_SECONDS = 120;
const WRITE_INTERVAL = 500;
/** A run not finished after this long is reported as failed, whatever Redis says. */
const STALE_AFTER = 6 * 60 * 1000;
/** Inside `maxDuration` (300s), so a slow run says so itself before the platform kills it. */
const RUN_DEADLINE = 285_000;

const POLICY: Policy = {
  name: "agents",
  /** High on purpose: a whole room shares one Wi-Fi address tonight. */
  limit: 30,
  window: 600,
  keyed: false,
};

const RUN_ID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

const keys = {
  run: (id: string) => `agents:run:${id}`,
  prepared: (id: string) => `agents:run:${id}:prepared`,
  store: (id: string) => `agents:run:${id}:store`,
  host: (host: string) => `agents:host:${host}`,
  day: () => `agents:day:${new Date().toISOString().slice(0, 10)}`,
  burst: () => `agents:burst:${Math.floor(Date.now() / (BURST_WINDOW * 1000))}`,
  runs: "agents:runs",
};

type SetOptions = { ex: number; nx?: boolean };

type Backend = {
  get: <T>(key: string) => Promise<T | null>;
  /** Resolves false only when `nx` was asked for and the key already exists. */
  set: (key: string, value: unknown, options: SetOptions) => Promise<boolean>;
  remove: (key: string) => Promise<void>;
  increment: (key: string, ttl: number) => Promise<number>;
  prepend: (key: string, value: string, keep: number) => Promise<void>;
  range: (key: string) => Promise<string[]>;
  many: <T>(keys: string[]) => Promise<(T | null)[]>;
};

type Slot = { value: string; expires: number };

/** Lives on globalThis because Next bundles each route handler separately in dev. */
const shared = globalThis as typeof globalThis & {
  __agentsMemory?: Map<string, Slot>;
};

const slots = () => {
  shared.__agentsMemory ??= new Map();
  return shared.__agentsMemory;
};

const peek = (key: string) => {
  const slot = slots().get(key);
  if (!slot) return null;
  if (slot.expires > Date.now()) return slot.value;
  slots().delete(key);
  return null;
};

const FOREVER = Number.MAX_SAFE_INTEGER;

/**
 * Local dev must not touch production Redis. Values go through JSON so a shape
 * Upstash would mangle fails here too.
 */
const memory: Backend = {
  get: async <T>(key: string) => {
    const value = peek(key);
    return value === null ? null : (JSON.parse(value) as T);
  },
  set: async (key, value, { ex, nx }) => {
    if (nx && peek(key) !== null) return false;
    slots().set(key, {
      value: JSON.stringify(value),
      expires: Date.now() + ex * 1000,
    });
    return true;
  },
  remove: async (key) => {
    slots().delete(key);
  },
  increment: async (key, ttl) => {
    const count = Number(peek(key) ?? 0) + 1;
    slots().set(key, {
      value: String(count),
      expires: Date.now() + ttl * 1000,
    });
    return count;
  },
  prepend: async (key, value, keep) => {
    const list = JSON.parse(peek(key) ?? "[]") as string[];
    slots().set(key, {
      value: JSON.stringify([value, ...list].slice(0, keep)),
      expires: FOREVER,
    });
  },
  range: async (key) => JSON.parse(peek(key) ?? "[]") as string[],
  many: async <T>(list: string[]) =>
    list.map((key) => {
      const value = peek(key);
      return value === null ? null : (JSON.parse(value) as T);
    }),
};

/** A loopback URL is the worktree preview's dead placeholder, not a Redis. */
const isDurable = (url = process.env.UPSTASH_REDIS_REST_URL) =>
  Boolean(url) && !/^https?:\/\/(127\.0\.0\.1|localhost)\b/.test(url ?? "");

const backend = async (): Promise<Backend> => {
  if (!isDurable()) return memory;

  // Imported only here: `Redis.fromEnv()` runs at module load.
  const { redis } = await import("../../utils/durable");

  return {
    get: <T>(key: string) => redis.get<T>(key),
    set: async (key, value, { ex, nx }) => {
      const answer = nx
        ? await redis.set(key, value, { ex, nx: true })
        : await redis.set(key, value, { ex });
      return answer !== null;
    },
    remove: async (key) => {
      await redis.del(key);
    },
    // Together, so a crash between the two cannot leak a counter with no expiry.
    increment: async (key, ttl) => {
      const [count] = (await redis
        .pipeline()
        .incr(key)
        .expire(key, ttl)
        .exec()) as [number, number];
      return count;
    },
    prepend: async (key, value, keep) => {
      await redis
        .pipeline()
        .lpush(key, value)
        .ltrim(key, 0, keep - 1)
        .exec();
    },
    range: (key) => redis.lrange<string>(key, 0, -1),
    many: async <T>(list: string[]) =>
      list.length === 0 ? [] : redis.mget<(T | null)[]>(...list),
  };
};

/**
 * A summary as it should be reported at `now`. Never leaves a run stuck: the
 * process that owned it may have been killed, so an old unfinished run is failed
 * at read time rather than trusted to have written its own ending.
 */
export const settle = (run: Summary, now: number): Summary => {
  if (run.stage === "done" || run.stage === "failed") return run;
  if (now - run.startedAt <= STALE_AFTER) return run;
  return {
    ...run,
    stage: "failed",
    error: "This run stopped before it finished. Please try again.",
  };
};

const blank = (id: string, origin: string, host: string): Summary => ({
  id,
  origin,
  host,
  name: null,
  platform: null,
  stage: "reading",
  error: null,
  startedAt: Date.now(),
  finishedAt: null,
  discovered: 0,
  read: 0,
  issues: 0,
  fixes: 0,
  needsMerchant: 0,
  google: { ready: 0, total: 0 },
  chatgpt: { ready: 0, total: 0 },
  merchant: null,
  upload: null,
  notes: [],
  log: [],
});

const MESSAGES = {
  invalid:
    "That does not look like a store address we can read. Check it and try again.",
  limited:
    "You have started a lot of stores in a row. Give it a few minutes and try again.",
  capacity:
    "We have prepared as many stores as we can for today. Please try again tomorrow.",
  unavailable: "We could not start this run. Please try again in a moment.",
} as const;

const refused = (kind: keyof typeof MESSAGES) => ({
  kind,
  message: MESSAGES[kind],
});

/**
 * Outcomes the page explains come back as data, never as errors: a typo or a
 * full day is not a defect. The dedupe is checked first so a double click costs
 * neither the caller's rate limit nor the day's capacity.
 *
 * `fresh` is false when an existing run was returned, and the caller must then
 * not execute it again.
 */
export const start = async ({
  url,
  request,
}: {
  url: string;
  request: Parameters<typeof consume>[0];
}) => {
  const target = resolveOrigin(url);
  if (!target) return refused("invalid");
  if (!(await isSafePublicHttpUrl(target.origin))) return refused("invalid");

  const outcome = await resultify(async () => {
    const memo = await backend();
    const lock = keys.host(target.host);

    const existing = await memo.get<string>(lock);
    if (existing) {
      const run = await memo.get<Summary>(keys.run(existing));
      // A failed run is not worth waiting out: on stage, retry has to retry.
      if (run?.stage !== "failed")
        return { kind: "started" as const, id: existing, fresh: false };
      await memo.remove(lock);
    }

    const verdict = await consume(request, POLICY);
    if (!verdict.allowed) return refused("limited");

    const burst = await memo.increment(keys.burst(), BURST_WINDOW);
    if (burst > BURST_LIMIT) return refused("limited");

    const count = await memo.increment(keys.day(), 2 * 24 * 60 * 60);
    if (count > DAILY_CAP) return refused("capacity");

    const id = crypto.randomUUID();
    const claimed = await memo.set(lock, id, {
      ex: DEDUPE_SECONDS,
      nx: true,
    });
    if (!claimed) {
      const winner = await memo.get<string>(lock);
      if (winner) return { kind: "started" as const, id: winner, fresh: false };
    }

    await memo.set(keys.run(id), blank(id, target.origin, target.host), {
      ex: TTL,
    });
    await memo.prepend(keys.runs, id, RUNS_KEPT);

    return { kind: "started" as const, id, fresh: true };
  });

  return outcome.success ? outcome.data : refused("unavailable");
};

/**
 * Writes the summary at most about every 500ms, in order, newest state winning.
 * `seal` ends it: a pipeline that outlived its deadline cannot overwrite the
 * failure it was given.
 */
const journal = (first: Summary, memo: Backend) => {
  const state = {
    summary: first,
    writtenAt: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
    queue: Promise.resolve() as Promise<unknown>,
    sealed: false,
  };

  const flush = () => {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    state.writtenAt = Date.now();
    state.queue = state.queue.then(() =>
      resultify(() =>
        memo.set(keys.run(state.summary.id), state.summary, { ex: TTL }),
      ),
    );
    return state.queue;
  };

  const patch = (change: Partial<Summary>) => {
    if (state.sealed) return;
    state.summary = { ...state.summary, ...change };
    if (state.timer) return;

    const elapsed = Date.now() - state.writtenAt;
    if (elapsed >= WRITE_INTERVAL) {
      void flush();
      return;
    }
    state.timer = setTimeout(flush, WRITE_INTERVAL - elapsed);
  };

  return {
    current: () => state.summary,
    patch,
    flush,
    note: (message: string) =>
      patch({ log: [...state.summary.log, message].slice(-LOG_KEPT) }),
    /** A finished run stays finished: what fails after that is only the merge watch. */
    fail: (error: string) => {
      if (state.summary.stage === "done") return;
      patch({ stage: "failed", error });
    },
    seal: () => {
      state.sealed = true;
    },
  };
};

type Journal = ReturnType<typeof journal>;

/**
 * 40 products, each with up to 20 variants and stored before and after, can pass
 * a megabyte, which is where Upstash plans start refusing a request. Gzipped so a
 * big catalog cannot fail a run at the very end.
 */
export const pack = (entries: Prepared[]) =>
  gzipSync(JSON.stringify(entries)).toString("base64");

const unpack = (packed: string) =>
  JSON.parse(
    gunzipSync(Buffer.from(packed, "base64")).toString(),
  ) as Prepared[];

const isError = (finding: Finding) => finding.severity === "error";

/**
 * What each channel's feed will contain, per product. The stage's counts and the
 * downloaded files both come from here, so the number on screen is the file.
 */
const googleItems = (entries: Prepared[], store: Store) =>
  entries
    .filter((entry) => entry.ready.google)
    .map((entry) =>
      Google.toItems(entry.product, store).filter(
        (item) => !Google.validate(item).some(isError),
      ),
    );

const chatgptRows = (entries: Prepared[], store: Store) =>
  entries
    .filter((entry) => entry.ready.chatgpt)
    .map((entry) =>
      ChatGPT.toRows(entry.product, store).filter(
        (row) => !ChatGPT.validate(row).some(isError),
      ),
    );

const tally = (entries: Prepared[], feeds: unknown[][]) => ({
  ready: feeds.filter((feed) => feed.length > 0).length,
  total: entries.length,
});

/** Seams for the spec, defaulting to the real steps, as `prepare` does for its model call. */
type Steps = {
  read: typeof Read.read;
  prepare: typeof Prepare.prepare;
  center: Pick<typeof MerchantCenter, "eligibility" | "push" | "confirm">;
};

const STEPS: Steps = {
  read: Read.read,
  prepare: Prepare.prepare,
  center: MerchantCenter,
};

const pipeline = async (log: Journal, memo: Backend, steps: Steps) => {
  const { id, origin, host } = log.current();

  const catalog = await steps.read({ origin, host }, { onProgress: log.note });
  if (!catalog.success) return log.fail(catalog.error.message);

  if (catalog.data.products.length === 0)
    return log.fail("We could not find any products on this store.");

  log.patch({
    name: catalog.data.store.name,
    platform: catalog.data.store.platform,
    discovered: catalog.data.discovered,
    read: catalog.data.products.length,
    notes: catalog.data.notes,
  });

  // Before preparing, because only a store that can publish earns a full rewrite.
  const merchant = await steps.center.eligibility(host);
  log.patch({ merchant, stage: "preparing" });

  const entries = await steps.prepare(catalog.data, {
    onProgress: ({ message, issues, fixes }) => {
      log.patch({ issues, fixes });
      log.note(message);
    },
    rewriteAll: merchant.eligible,
  });

  await Promise.all([
    memo.set(keys.prepared(id), pack(entries), { ex: TTL }),
    memo.set(keys.store(id), catalog.data.store, { ex: TTL }),
  ]);

  const google = tally(entries, googleItems(entries, catalog.data.store));
  const chatgpt = tally(entries, chatgptRows(entries, catalog.data.store));

  log.patch({
    stage: "channels",
    fixes: entries.reduce((sum, entry) => sum + entry.fixes.length, 0),
    needsMerchant: entries.reduce(
      (sum, entry) => sum + entry.findings.length,
      0,
    ),
    google,
    chatgpt,
  });
  log.note(
    `${google.ready} of ${google.total} products ready for Google, ${chatgpt.ready} of ${chatgpt.total} ready for ChatGPT.`,
  );

  const finish = async () => {
    log.patch({ stage: "done", finishedAt: Date.now() });
    await log.flush();
  };

  if (!merchant.eligible) {
    await finish();
    return;
  }

  const onLines = (lines: OfferLine[]) =>
    log.patch({ merchant: { ...merchant, lines } });

  log.note("Publishing fixes to Merchant Center.");
  const pushed = await steps.center.push(entries, merchant, onLines);
  if (!pushed.success)
    return log.fail(
      `We prepared the feeds but could not publish to Merchant Center. ${pushed.error.message}`,
    );

  // Accepted by Google's API counts, so the clock stops here. The merge watch
  // keeps updating lines afterwards without moving `finishedAt`.
  await finish();
  await steps.center.confirm(pushed.data, merchant, onLines);
};

/** Never throws and always writes an ending: it runs in `after()`, with no one to catch it. */
export const execute = async (id: string, seams: Partial<Steps> = {}) => {
  const memo = await resultify(() => backend());
  if (!memo.success) return;

  const first = await resultify(() => memo.data.get<Summary>(keys.run(id)));
  if (!first.success || !first.data) return;

  const log = journal(first.data, memo.data);

  const deadline = new Promise<never>((_, reject) => {
    AbortSignal.timeout(RUN_DEADLINE).addEventListener("abort", () =>
      reject(new Error("Run deadline passed")),
    );
  });

  const outcome = await resultify(() =>
    Promise.race([pipeline(log, memo.data, { ...STEPS, ...seams }), deadline]),
  );

  if (!outcome.success) {
    Sentry.captureException(outcome.error, {
      tags: { feature: "agents-storefront" },
      extra: { run: id, host: first.data.host },
    });
    log.fail(
      "Something went wrong while preparing this store. Please try again.",
    );
  }

  log.seal();
  await log.flush();
};

export const summary = async (id: string) => {
  if (!RUN_ID.test(id)) return null;
  const memo = await backend();
  const run = await memo.get<Summary>(keys.run(id));
  return run ? settle(run, Date.now()) : null;
};

export const prepared = async (id: string) => {
  if (!RUN_ID.test(id)) return null;
  const memo = await backend();
  const packed = await memo.get<string>(keys.prepared(id));
  return packed ? unpack(packed) : null;
};

/**
 * One channel's file. Only products ready for that channel, and only the items
 * its own validator passes: an `error` finding keeps an item out of the feed.
 */
export const feed = async (id: string, channel: string) => {
  if (!RUN_ID.test(id)) return null;
  const memo = await backend();
  const [packed, store] = await Promise.all([
    memo.get<string>(keys.prepared(id)),
    memo.get<Store>(keys.store(id)),
  ]);
  if (!packed || !store) return null;
  const entries = unpack(packed);

  switch (channel) {
    case "google":
      return {
        body: Google.feed(store, googleItems(entries, store).flat()),
        type: "application/xml; charset=utf-8",
        filename: `${store.host}-google.xml`,
      };
    case "chatgpt":
      return {
        body: ChatGPT.csv(chatgptRows(entries, store).flat()),
        type: "text/csv; charset=utf-8",
        filename: `${store.host}-chatgpt.csv`,
      };
    default:
      return null;
  }
};

/**
 * Every store prepared tonight. A store run twice counts once, at its newest
 * run, and a failed run prepared nothing, so neither inflates the room's numbers.
 * Each store also gets one row: its newest run that worked, else its newest.
 */
export const board = async (): Promise<Board> => {
  const memo = await backend();
  const ids = await memo.range(keys.runs);
  const found = await memo.many<Summary>(ids.map(keys.run));
  const now = Date.now();
  const runs = found.flatMap((run) => (run ? [settle(run, now)] : []));

  const chronological = [...runs].reverse();
  const latest = new Map(
    chronological
      .filter((run) => run.stage !== "failed")
      .map((run) => [run.host, run]),
  );
  const rows = new Map([
    ...chronological.map((run) => [run.host, run] as const),
    ...latest,
  ]);

  return {
    stores: latest.size,
    products: [...latest.values()].reduce((sum, run) => sum + run.read, 0),
    runs: runs.filter((run) => rows.get(run.host) === run).slice(0, BOARD_RUNS),
  };
};
