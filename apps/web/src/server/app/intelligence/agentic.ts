"use server";

/**
 * Agentic score — is-agentic.com's reading of how usable a store's public
 * domain is to an AI agent, brought into the dashboard with the history the
 * CLI cannot keep.
 *
 * The score is a third party's and stays labelled as one. We add three things
 * `npx is-agentic <domain>` does not: the scan runs against the connected
 * store's domain without the merchant typing it, the result is stored so the
 * trend across scans is visible, and the six payment checks are linked to the
 * ecentic pages that fix them. The node map is the observed agent walk from
 * the same public report — supporting evidence, not a second score.
 *
 * Scanning is always merchant-initiated. Nothing here runs on a cron or on
 * render: a scan sends the merchant's domain to a third party, so it happens
 * when they press the button and not before. The wire contract, and why the
 * stream is treated as best-effort, is documented in `agentic-contract.ts`.
 * The journey map is read-only: we never dispatch an agent walk of our own.
 */

import { resultify } from "@zenncore/utils";
import { and, eq } from "drizzle-orm";
import { schema } from "../../database";
import * as AI from "../../utils/ai";
import { dedupe } from "../../utils/dedupe";
import { withSubscription } from "../../utils/entitlement";
import { Environment } from "../../utils/environment";
import * as HTTP from "../../utils/http";
import * as AgenticScan from "../agentic-scan";
import * as Competitor from "../competitor";
import * as Store from "../store";
import {
  IS_AGENTIC_ORIGIN,
  type JourneySnapshot,
  type JourneyStep,
  journeyRecordSchema,
  journeySnapshotSchema,
  METHODOLOGY_TTL_MS,
  type MethodologyBlock,
  methodologyToolSchema,
  normalizeTarget,
  ORA_ORIGIN,
  parseMethodology,
  type Report,
  RUNNING_STALE_MS,
  SCAN_COOLDOWN_MS,
  SCAN_DEADLINE_MS,
  type ScanEvent,
  type SlimReport,
  slimReportSchema,
  stepsFromPayload,
  streamFrameSchema,
  USER_AGENT,
} from "./agentic-contract";

const REPORT_TIMEOUT_MS = 15_000;

/**
 * Reads the documented, versioned report API — the durable contract. Returns
 * `null` for a target they have never scanned (their `report_not_found`), which
 * is an answer rather than a failure.
 */
const readSlimReport = async (target: string): Promise<SlimReport | null> => {
  const endpoint = new URL("/api/v1/report", IS_AGENTIC_ORIGIN);
  endpoint.searchParams.set("url", target);

  const response = await HTTP.request(
    endpoint.toString(),
    {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    },
    { timeout: REPORT_TIMEOUT_MS },
  );
  if (!response.success || !response.data.ok) return null;

  const body = await resultify(() => response.data.json());
  if (!body.success) return null;

  const parsed = slimReportSchema.safeParse(body.data);
  return parsed.success ? parsed.data : null;
};

/**
 * The public report for a target, or `null` when they hold none. Used to show
 * a score before the merchant has ever run a scan of their own, and to keep
 * something on the page when the stream contract drifts.
 */
export const publicReport = withSubscription(
  async (_context, { store: storeId }: { store: string }) => {
    const store = await Store.resolveForUser(Environment.SERVER, {
      store: storeId,
    });
    if (!store.success) return store;

    const report = await readSlimReport(normalizeTarget(store.data.domain));
    return { success: true as const, data: report };
  },
  "Agentic.publicReport",
);

/**
 * Their MCP server answers JSON-RPC over Streamable HTTP and replies in SSE
 * frames even for a single call, so the body is unwrapped rather than parsed as
 * plain JSON. No `initialize` handshake and no session id — verified against the
 * live server, which serves `tools/list` cold.
 */
const callMCP = async (tool: string, args: Record<string, unknown>) => {
  const response = await resultify(() =>
    fetch(`${IS_AGENTIC_ORIGIN}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method: "tools/call",
        params: { name: tool, arguments: args },
      }),
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    }),
  );
  if (!response.success || !response.data.ok) return null;

  const body = await resultify(() => response.data.text());
  if (!body.success) return null;

  const payload = body.data
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  const parsed = resultify(() => JSON.parse(payload || body.data) as unknown);
  return parsed.success ? parsed.data : null;
};

/**
 * How the score is computed, in their own words, so the page can explain the
 * number instead of only showing it. The text is identical for every account
 * and changes about never, so it is memoised per server instance rather than
 * fetched on each render.
 */
const methodologyCache: { blocks: MethodologyBlock[] | null; expires: number } =
  { blocks: null, expires: 0 };

export const methodology = withSubscription(async () => {
  if (methodologyCache.blocks && Date.now() < methodologyCache.expires)
    return { success: true as const, data: methodologyCache.blocks };

  const result = await callMCP("is_agentic_get_methodology", {});
  const parsed = methodologyToolSchema.safeParse(result);
  // An explainer that cannot be fetched is not an error worth failing a page
  // over — the section simply does not render.
  if (!parsed.success) return { success: true as const, data: [] };

  const structured =
    parsed.data.result?.structuredContent ?? parsed.data.structuredContent;
  if (!structured) return { success: true as const, data: [] };

  const blocks = parseMethodology(structured.content);
  methodologyCache.blocks = blocks;
  methodologyCache.expires = Date.now() + METHODOLOGY_TTL_MS;

  return { success: true as const, data: blocks };
}, "Agentic.methodology");

/**
 * How long a discovered journey run id is reused before we re-read the public
 * Is Agentic report page. Hits last longer than misses so a missing walk is
 * retried soon without hammering their HTML on every dashboard render.
 */
const JOURNEY_HIT_TTL_MS = 30 * 60 * 1000;
const JOURNEY_MISS_TTL_MS = 2 * 60 * 1000;
const JOURNEY_PAGE_TIMEOUT_MS = 12_000;
const JOURNEY_RUN_TIMEOUT_MS = 10_000;
const JOURNEY_STREAM_TIMEOUT_MS = 4_000;
const JOURNEY_RUN_ID =
  /\/api\/journey\/runs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

const journeyIndex = new Map<string, { id: string | null; expires: number }>();

const oraHeaders = {
  Accept: "application/json",
  "User-Agent": USER_AGENT,
} as const;

/**
 * Is Agentic's public report page embeds the Ora run that drew the node map.
 * The versioned score API does not carry that walk, and listing journeys by
 * domain needs a partner key we do not hold — so the run id is read from the
 * page they already publish, then the trajectory is fetched from Ora.
 */
const discoverRunId = async (target: string): Promise<string | null> => {
  const cached = journeyIndex.get(target);
  if (cached && Date.now() < cached.expires) return cached.id;

  const endpoint = new URL(`/scan/${target}`, IS_AGENTIC_ORIGIN);
  const response = await HTTP.request(
    endpoint.toString(),
    {
      method: "GET",
      headers: { Accept: "text/html", "User-Agent": USER_AGENT },
    },
    { timeout: JOURNEY_PAGE_TIMEOUT_MS },
  );
  if (!response.success || !response.data.ok) {
    journeyIndex.set(target, {
      id: null,
      expires: Date.now() + JOURNEY_MISS_TTL_MS,
    });
    return null;
  }

  const body = await resultify(() => response.data.text());
  const match = body.success ? body.data.match(JOURNEY_RUN_ID) : null;
  const id = match?.[1] ?? null;

  journeyIndex.set(target, {
    id,
    expires: Date.now() + (id ? JOURNEY_HIT_TTL_MS : JOURNEY_MISS_TTL_MS),
  });
  return id;
};

/**
 * A live run's GET body has no trajectory — those frames only exist on the
 * SSE stream. We open it briefly, keep the latest cumulative snapshot, then
 * abort so a dashboard render never holds the connection for the whole walk.
 */
const peekTrajectory = async (id: string): Promise<JourneyStep[]> => {
  const endpoint = new URL(`/api/journey/runs/${id}/stream`, ORA_ORIGIN);
  const response = await resultify(() =>
    fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-store",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(JOURNEY_STREAM_TIMEOUT_MS),
    }),
  );
  if (!response.success || !response.data.ok || !response.data.body) return [];

  const reader = response.data.body.getReader();
  const decoder = new TextDecoder();
  const state = { buffer: "", steps: [] as JourneyStep[] };

  const handle = (frame: string) => {
    const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const data = frame
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    if (event !== "trajectory" && event !== "result") return;
    if (!data) return;

    const payload = resultify(() => JSON.parse(data) as unknown);
    if (!payload.success) return;

    const steps = stepsFromPayload(payload.data);
    if (steps.length > 0) state.steps = steps;
  };

  const drain = async () => {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;

      state.buffer += decoder.decode(chunk.value, { stream: true });
      state.buffer = state.buffer.replace(/\r\n/g, "\n");

      const boundary = () => state.buffer.indexOf("\n\n");
      while (boundary() !== -1) {
        handle(state.buffer.slice(0, boundary()));
        state.buffer = state.buffer.slice(boundary() + 2);
      }
    }

    state.buffer += decoder.decode();
    if (state.buffer.trim()) handle(state.buffer);
  };

  await resultify(drain);
  await resultify(() => reader.cancel());
  reader.releaseLock();
  if (state.buffer.trim()) handle(state.buffer);
  return state.steps;
};

const readJourney = async (
  id: string,
  target: string,
): Promise<JourneySnapshot | null> => {
  const endpoint = new URL(`/api/journey/runs/${id}`, ORA_ORIGIN);
  const response = await HTTP.request(
    endpoint.toString(),
    { method: "GET", headers: oraHeaders },
    { timeout: JOURNEY_RUN_TIMEOUT_MS },
  );
  if (!response.success || !response.data.ok) return null;

  const body = await resultify(() => response.data.json());
  if (!body.success) return null;

  const parsed = journeyRecordSchema.safeParse(body.data);
  if (!parsed.success) return null;

  const domain = normalizeTarget(parsed.data.domain ?? "");
  if (domain && domain !== target) return null;

  const snapshot = journeySnapshotSchema.safeParse({
    id: parsed.data.id,
    status: parsed.data.status,
    domain: domain || target,
    intentId: parsed.data.intent_id ?? null,
    verdict: parsed.data.result?.verdict ?? parsed.data.verdict ?? null,
    insight: parsed.data.result?.insight?.summary ?? null,
    steps: parsed.data.result?.trajectory?.steps ?? [],
    reportUrl: `${IS_AGENTIC_ORIGIN}/scan/${target}`,
  });
  if (!snapshot.success) return null;

  if (snapshot.data.status === "running" && snapshot.data.steps.length === 0) {
    const live = await peekTrajectory(id);
    if (live.length > 0) return { ...snapshot.data, steps: live };
  }

  return snapshot.data;
};

/**
 * The observed agent walk Is Agentic shows on the public report — supporting
 * evidence, not part of the numeric score. `null` when they have not published
 * a run for this domain yet.
 */
export const observedJourney = withSubscription(
  async (_context, { store: storeId }: { store: string }) => {
    const store = await Store.resolveForUser(Environment.SERVER, {
      store: storeId,
    });
    if (!store.success) return store;

    const target = normalizeTarget(store.data.domain);
    if (!target) return { success: true as const, data: null };

    const id = await discoverRunId(target);
    if (!id) return { success: true as const, data: null };

    const snapshot = await readJourney(id, target);
    return { success: true as const, data: snapshot };
  },
  "Agentic.observedJourney",
);

/**
 * Re-reads one run so the map can fill in while an agent is still walking.
 * The id must already belong to this store's domain — this is not a way to
 * start a journey, or to read someone else's.
 */
export const journeySnapshot = withSubscription(
  async (_context, { store: storeId, run }: { store: string; run: string }) => {
    const store = await Store.resolveForUser(Environment.SERVER, {
      store: storeId,
    });
    if (!store.success) return store;

    const target = normalizeTarget(store.data.domain);
    if (!target) return { success: true as const, data: null };
    if (!JOURNEY_RUN_ID.test(`/api/journey/runs/${run}`))
      return { success: true as const, data: null };

    const snapshot = await readJourney(run, target);
    return { success: true as const, data: snapshot };
  },
  "Agentic.journeySnapshot",
);

/**
 * The distinct storefront domains behind this store's selected competitors.
 * Competitor rows are products, so many share one domain — the roster is the
 * deduplicated set, and it doubles as the allowlist of what `scan` will accept
 * as a target. Without that allowlist the action would be an open relay for
 * pointing a third-party scanner at any domain a caller names.
 */
export const competitorTargets = dedupe(
  withSubscription(async (_context, { store: storeId }: { store: string }) => {
    const store = await Store.resolveForUser(Environment.SERVER, {
      store: storeId,
    });
    if (!store.success) return store;

    const competitors = await Competitor.listForStore(Environment.SERVER, {
      store: storeId,
    });
    if (!competitors.success) return competitors;

    const own = normalizeTarget(store.data.domain);
    const targets = [
      ...new Set(
        competitors.data
          .filter((competitor) => competitor.selected)
          .map((competitor) => normalizeTarget(competitor.url ?? ""))
          .filter((target) => target && target !== own),
      ),
    ].sort();

    return { success: true as const, data: targets };
  }, "Agentic.competitorTargets"),
);

/** One `data:` frame of an SSE stream, already split on the blank line. */
const framePayload = (frame: string): unknown => {
  const data = frame
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;

  const parsed = resultify(() => JSON.parse(data) as unknown);
  return parsed.success ? parsed.data : null;
};

/**
 * Drives the scan stream, forwarding progress through `emit` and returning the
 * finished report. Frames we do not model are skipped rather than rejected —
 * their contract may grow mid-scan and a scan in progress must survive it.
 */
const streamScan = async (
  target: string,
  emit: (event: ScanEvent) => void,
): Promise<Report> => {
  const endpoint = new URL("/api/scan/stream", IS_AGENTIC_ORIGIN);
  endpoint.searchParams.set("target", target);

  // Deliberately not `HTTP.request`: that helper clears its timeout once the
  // response headers land, which is exactly wrong for a stream whose whole
  // duration is in the body. The signal has to reach the body read, so a
  // stalled scanner aborts instead of holding this action open. Matches the
  // sibling streaming fetches in `free-for-all.ts` and `product-comparison.ts`.
  const response = await resultify(() =>
    fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-store",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(SCAN_DEADLINE_MS),
    }),
  );

  if (!response.success)
    throw new Error(
      `Could not reach the Is Agentic scanner: ${response.error.message}`,
    );
  if (!response.data.ok || !response.data.body)
    throw new Error(
      `The Is Agentic scanner returned HTTP ${response.data.status}.`,
    );

  const reader = response.data.body.getReader();
  const decoder = new TextDecoder();

  // Mutable run state: an SSE fold has to accumulate, and threading it through
  // a reducer would buy nothing here.
  const state = {
    buffer: "",
    completed: 0,
    summary: null as string | null,
    notApplicableReasons: {} as Record<string, string>,
    result: null as Report | null,
  };

  const handle = (frame: string) => {
    const payload = framePayload(frame);
    if (!payload) return;

    const parsed = streamFrameSchema.safeParse(payload);
    if (!parsed.success) return;

    const event = parsed.data;
    switch (event.type) {
      case "scan_init": {
        // Either field may be the one present; whichever arrives first wins,
        // and a frame carrying neither is simply not a roster announcement.
        const total = event.checkRoster?.length ?? event.totalChecks;
        if (total) emit({ kind: "roster", total });
        return;
      }
      case "discovery_phase": {
        const label = event.label ?? event.step;
        if (label) emit({ kind: "phase", label });
        return;
      }
      case "check_complete":
        state.completed += 1;
        emit({
          kind: "check",
          id: event.checkId,
          name: event.checkName,
          layer: event.layerName,
          status: event.status,
          completed: state.completed,
        });
        return;
      case "relevance_assessed":
        state.notApplicableReasons = event.reasons;
        return;
      case "summary_ready":
        state.summary = event.agenticSummary;
        emit({ kind: "summary", summary: event.agenticSummary });
        return;
      case "scan_complete":
        state.result = {
          ...event.result,
          summary: state.summary,
          notApplicableReasons: state.notApplicableReasons,
          reportUrl: `${IS_AGENTIC_ORIGIN}/scan/${target}`,
        };
        return;
      case "error":
        throw new Error("The Is Agentic scanner did not finish this scan.");
    }
  };

  const drain = async () => {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;

      // Normalize the whole buffer, never the chunk on its own: a CRLF can
      // straddle two reads, and normalizing only the second half leaves the
      // terminator as "\r\n", hiding the blank line that ends a frame.
      state.buffer += decoder.decode(chunk.value, { stream: true });
      state.buffer = state.buffer.replace(/\r\n/g, "\n");

      // A frame ends at a blank line; anything after the last one is a partial
      // frame that belongs to the next read.
      const boundary = () => state.buffer.indexOf("\n\n");
      while (boundary() !== -1) {
        handle(state.buffer.slice(0, boundary()));
        state.buffer = state.buffer.slice(boundary() + 2);
      }
    }

    // Flush any multi-byte character straddling the last chunk, then handle a
    // final frame that arrived without its terminating blank line.
    state.buffer += decoder.decode();
    if (state.buffer.trim()) handle(state.buffer);
  };

  const drained = await resultify(drain);
  await resultify(() => reader.cancel());
  reader.releaseLock();
  if (!drained.success) throw drained.error;

  if (!state.result)
    throw new Error("The Is Agentic scan ended before a report was produced.");

  // `notApplicableReasons` arrives after the checks it explains, so the stored
  // report carries the merged view even though the stream did not.
  return state.result;
};

/**
 * Runs a scan of the store's domain and streams it check by check.
 *
 * Refuses rather than stacks: a run already in flight, or a completed scan
 * inside the cooldown, comes back as a `blocked` event so the client can say
 * why. The cooldown exists because the scanner is a free service we do not
 * own — re-reading a day-old report is almost always the right answer.
 */
export const scan = withSubscription(
  async (
    context,
    { store: storeId, target: requested }: { store: string; target?: string },
  ) => {
    const userId = context.session.user.id;

    const store = await Store.resolveForUser(Environment.SERVER, {
      store: storeId,
    });
    if (!store.success) return store;

    const own = normalizeTarget(store.data.domain);
    if (!own)
      return {
        success: false as const,
        error: new Error("This store has no public domain to scan."),
      };

    // A caller-supplied target is only ever one of this store's own competitor
    // domains. Without that check the action would point a third party's
    // scanner at any host a caller named, on our IP and our reputation.
    const target = await (async () => {
      if (!requested) return own;

      const allowed = await competitorTargets(Environment.SERVER, {
        store: storeId,
      });
      if (!allowed.success) return null;

      const wanted = normalizeTarget(requested);
      return allowed.data.includes(wanted) ? wanted : null;
    })();

    if (!target)
      return {
        success: false as const,
        error: new Error("That domain is not on this store's competitor list."),
      };

    const recent = await AgenticScan.find(Environment.SERVER, {
      where: and(
        eq(schema.agenticScan.storeId, storeId),
        eq(schema.agenticScan.userId, userId),
        // Cooldown and the in-flight lock are per domain: scanning a competitor
        // must not lock out a scan of the merchant's own storefront.
        eq(schema.agenticScan.target, target),
      ),
      orderBy: [
        { column: schema.agenticScan.createdAt, direction: "desc" as const },
      ],
      limit: 5,
    });
    if (!recent.success) return recent;

    const blocked = ((): ScanEvent | null => {
      const running = recent.data.find(
        (row) =>
          row.status === "running" &&
          Date.now() - row.createdAt.getTime() < RUNNING_STALE_MS,
      );
      if (running)
        return {
          kind: "blocked",
          reason: "running",
          availableAt: running.createdAt.toISOString(),
        };

      const complete = recent.data.find((row) => row.status === "complete");
      const elapsed = complete
        ? Date.now() - complete.createdAt.getTime()
        : Number.POSITIVE_INFINITY;
      if (elapsed < SCAN_COOLDOWN_MS && complete)
        return {
          kind: "blocked",
          reason: "cooldown",
          availableAt: new Date(
            complete.createdAt.getTime() + SCAN_COOLDOWN_MS,
          ).toISOString(),
        };

      return null;
    })();

    if (blocked)
      return {
        success: true as const,
        data: AI.streamable<ScanEvent>(async (update) => update(blocked)),
      };

    const row = await AgenticScan.create(Environment.SERVER, {
      userId,
      storeId,
      target,
      status: "running",
    });
    if (!row.success) return row;

    return {
      success: true as const,
      data: AI.streamable<ScanEvent>(async (update) => {
        const report = await resultify(() => streamScan(target, update));

        if (!report.success) {
          await AgenticScan.update(Environment.SERVER, row.data.id, {
            status: "failed",
            error: report.error.message,
            updatedAt: new Date(),
          });
          update({ kind: "error", message: report.error.message });
          return;
        }

        const stored = await AgenticScan.update(
          Environment.SERVER,
          row.data.id,
          {
            status: "complete",
            score: Math.round(report.data.score),
            grade: report.data.grade ?? null,
            report: report.data,
            updatedAt: new Date(),
          },
        );

        // The client refreshes the route on `report`, and the route reads the
        // stored row — so a write that failed must not be announced as a scan.
        if (!stored.success) {
          update({ kind: "error", message: stored.error.message });
          return;
        }

        update({ kind: "report", report: report.data });
      }),
    };
  },
  "Agentic.scan",
);
