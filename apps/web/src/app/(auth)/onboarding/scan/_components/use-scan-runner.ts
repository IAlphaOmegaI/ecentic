"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Simulate from "@/server/app/intelligence/simulate";
import * as Scan from "@/server/app/scan";

type ScanPhase = "pre" | "running" | "complete";
type ModelStatus = "queued" | "running" | "complete";
type LogEntry = { id: number; model: string; message: string; elapsed: number };
type Stats = { wins: number; losses: number; progress: number };

const modelMeta = [
  { id: "gpt4", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
] as const;

const initialStats: Stats = { wins: 0, losses: 0, progress: 0 };

const initialStatuses: Record<string, ModelStatus> = {
  ChatGPT: "queued",
  Claude: "queued",
  Gemini: "queued",
};

const POLL_INTERVAL = 1500;

/**
 * Consecutive polls that may fail before we stop and tell the user. A single
 * miss is routine (a suspended tab, a dropped keep-alive, a deploy rotating the
 * server mid-request) and the scan keeps draining server-side regardless, so
 * one failure must not kill the run. Five straight misses — ~6s when requests
 * fail instantly (the first tick fires at once, the rest each poll interval),
 * longer when they fail slowly — means we are genuinely disconnected and the
 * spinner would otherwise never resolve.
 */
const MAX_CONSECUTIVE_MISSES = 5;

const TRANSPORT_MESSAGE =
  "Lost connection to the server. Reload the page to pick the scan back up.";

// A transport failure here does not prove the scan never started — the
// response can be lost after the server created it. "Try again" is safe
// regardless: `Simulation.enqueueScan` reuses this store's in-flight scan, so
// a retry reattaches to whatever the lost response created instead of
// stacking a duplicate.
const ENQUEUE_TRANSPORT_MESSAGE =
  "Couldn't reach the server to start the scan. Check your connection and try again.";

/**
 * Marks a failure of the request itself, as opposed to an error the server
 * action deliberately returned. Server-side failures are already captured by
 * the action wrappers, but a transport failure never reaches the server — the
 * client is the only place it can be observed, so the give-up paths below
 * report these (and only these) to Sentry.
 */
class TransportError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TransportError";
  }
}

/**
 * The `Result` a server action resolves to, spelled out structurally rather
 * than as `Result<T>` — the latter's success branch is a conditional type, so
 * behind a generic wrapper `data` degrades to optional and stops narrowing.
 */
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: Error };

/**
 * Server actions hand back a `Result`, but the fetch that carries them can
 * still reject — Safari failing in-flight requests for a backgrounded tab, a
 * network blip, a deploy swapping the server out mid-request. That rejection
 * (`TypeError: Load failed` in Safari) escapes as an unhandled promise
 * rejection wherever the call sits behind a bare `void`. Fold transport
 * failures into the same shape the action already returns, so there is one
 * thing to branch on and nothing left dangling.
 *
 * A single swallowed failure only leaves a breadcrumb — turning every blip
 * into a Sentry event would recreate the noise this exists to remove. The
 * call sites that actually give up capture the `TransportError` as an event,
 * with the original rejection attached as its `cause`.
 */
const call = async <T>(
  action: () => Promise<ActionResult<T>>,
  transportMessage: string = TRANSPORT_MESSAGE,
): Promise<ActionResult<T>> => {
  try {
    return await action();
  } catch (caught) {
    Sentry.addBreadcrumb({
      category: "scan.transport",
      level: "warning",
      message: caught instanceof Error ? caught.message : String(caught),
    });
    return {
      success: false,
      error: new TransportError(transportMessage, { cause: caught }),
    };
  }
};

const RETRY_DELAY = 1000;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * `call`, but transport failures get a few spaced attempts before the failure
 * is returned. Only transport failures retry — an error the server actually
 * returned is deterministic, and repeating the request would just replay it.
 * Repeats are safe at both call sites because `Simulation.enqueueScan` is
 * idempotent and `Scan.getInFlight` is a read.
 */
const callWithRetry = async <T>(
  action: () => Promise<ActionResult<T>>,
  {
    attempts,
    transportMessage,
  }: { attempts: number; transportMessage?: string },
): Promise<ActionResult<T>> => {
  const result = await call(action, transportMessage);
  if (
    result.success ||
    !(result.error instanceof TransportError) ||
    attempts <= 1
  )
    return result;
  await delay(RETRY_DELAY);
  return callWithRetry(action, { attempts: attempts - 1, transportMessage });
};

const labelFor = (id: string) =>
  modelMeta.find((model) => model.id === id)?.label ?? id;

type Derived = {
  stats: Stats;
  statuses: Record<string, ModelStatus>;
  modelStats: Record<string, { wins: number; losses: number }>;
  winRates: Record<string, { wins: number; losses: number; rate: number }>;
  count: number;
  topFinding: Simulate.TopFinding | null;
};

const derive = (progress: Scan.Progress): Derived => {
  const done = progress.status === "complete" || progress.status === "failed";
  const expected =
    progress.totalSimulations > 0
      ? progress.totalSimulations / modelMeta.length
      : 0;

  const models = modelMeta.map(({ id, label }) => {
    const model = progress.perModel[id] ?? { wins: 0, losses: 0, total: 0 };
    const status: ModelStatus = (() => {
      switch (true) {
        case done:
        case expected > 0 && model.total >= expected:
          return "complete";
        case model.total > 0:
          return "running";
        default:
          return "queued";
      }
    })();
    return { id, label, model, status };
  });

  const progressPercentage = (() => {
    switch (true) {
      case progress.status === "complete":
        return 100;
      case progress.totalSimulations > 0:
        return Math.min(
          Math.round((progress.completed / progress.totalSimulations) * 100),
          99,
        );
      default:
        return 0;
    }
  })();

  return {
    stats: {
      wins: progress.wins,
      losses: progress.losses,
      progress: progressPercentage,
    },
    statuses: Object.fromEntries(
      models.map(({ label, status }) => [label, status]),
    ),
    modelStats: Object.fromEntries(
      models.map(({ label, model }) => [
        label,
        { wins: model.wins, losses: model.losses },
      ]),
    ),
    winRates: Object.fromEntries(
      models.map(({ id, model }) => [
        id,
        {
          wins: model.wins,
          losses: model.losses,
          rate:
            model.total > 0 ? Math.round((model.wins / model.total) * 100) : 0,
        },
      ]),
    ),
    count: progress.productCount,
    topFinding: progress.topFinding ?? null,
  };
};

type ScanRunnerOptions = {
  // Scans are store-scoped; null means no store is connected yet, so nothing
  // can run or resume.
  store: string | null;
  onError?: (text: string) => void;
};

export const useScanRunner = (options: ScanRunnerOptions) => {
  const { store } = options;
  const [phase, setPhase] = useState<ScanPhase>("pre");
  const [stats, setStats] = useState<Stats>(initialStats);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statuses, setStatuses] =
    useState<Record<string, ModelStatus>>(initialStatuses);
  const [modelStats, setModelStats] = useState<
    Record<string, { wins: number; losses: number }>
  >({});
  const [winRates, setWinRates] = useState<
    Record<string, { wins: number; losses: number; rate: number }>
  >({});
  const [topFinding, setTopFinding] = useState<Simulate.TopFinding | null>(
    null,
  );
  const [scanId, setScanId] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const start = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);
  const shown = useRef<number>(0);
  const misses = useRef<number>(0);
  // Monotonic run id, bumped by stopTimers(). Intervals can be cleared, but a
  // request already in the air cannot — when its response lands after polling
  // stopped (reset, a new run, give-up), comparing against this lets it
  // recognize itself as stale and discard instead of writing over the next
  // run's state.
  const generation = useRef<number>(0);
  const onError = useRef(options?.onError);
  onError.current = options?.onError;

  const stopTimers = useCallback(() => {
    generation.current += 1;
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (poller.current) {
      clearInterval(poller.current);
      poller.current = null;
    }
  }, []);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const reset = useCallback(() => {
    stopTimers();
    setPhase("pre");
    setStats(initialStats);
    setLogs([]);
    setStatuses(initialStatuses);
    setModelStats({});
    setWinRates({});
    setTopFinding(null);
    setScanId(null);
    setCount(0);
    setElapsed(0);
    shown.current = 0;
    misses.current = 0;
  }, [stopTimers]);

  const ingest = useCallback((progress: Scan.Progress) => {
    const derived = derive(progress);
    setStats(derived.stats);
    setStatuses(derived.statuses);
    setModelStats(derived.modelStats);
    setWinRates(derived.winRates);
    setCount(derived.count);
    setTopFinding(derived.topFinding);

    if (progress.completed <= shown.current) return;

    const fresh = progress.recent.slice(
      Math.max(
        0,
        progress.recent.length - (progress.completed - shown.current),
      ),
    );
    setLogs((previous) => [
      ...previous,
      ...fresh.map((row, index) => ({
        id: previous.length + index + 1,
        model: labelFor(row.model),
        message: `picked ${
          row.winner === "product" ? "your product" : "the competitor"
        }${row.reasoning ? ` — ${row.reasoning.slice(0, 80)}` : ""}`,
        elapsed: Date.now() - start.current,
      })),
    ]);
    shown.current = progress.completed;
  }, []);

  const poll = useCallback(
    (id: string) => {
      stopTimers();

      misses.current = 0;

      const run = generation.current;
      // On the closure rather than a ref so each run tracks only its own
      // requests. A response can take longer than POLL_INTERVAL to fail, and
      // stacked slow requests would corrupt the miss counter.
      const inFlight = { current: false };

      const tick = async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        const progress = await call(() => Scan.getProgress({ id }));
        inFlight.current = false;

        // Polling stopped or restarted while this request was in the air — the
        // response belongs to a run that no longer exists.
        if (generation.current !== run) return;

        if (!progress.success) {
          // Only a transport failure can be the browser's doing — a
          // backgrounded tab has its in-flight fetches failed out from under
          // it. An error the server returned means the round-trip completed,
          // so it counts regardless of visibility.
          if (
            progress.error instanceof TransportError &&
            document.visibilityState === "hidden"
          )
            return;

          misses.current += 1;
          if (misses.current < MAX_CONSECUTIVE_MISSES) return;

          stopTimers();
          setPhase("pre");
          if (progress.error instanceof TransportError) {
            Sentry.captureException(progress.error);
          }
          onError.current?.(progress.error.message);
          return;
        }

        misses.current = 0;
        ingest(progress.data);

        switch (progress.data.status) {
          case "complete":
            stopTimers();
            setStats({
              wins: progress.data.wins,
              losses: progress.data.losses,
              progress: 100,
            });
            setTimeout(() => setPhase("complete"), 800);
            return;
          case "failed":
            stopTimers();
            setPhase("pre");
            onError.current?.("Simulation failed. Please try again.");
            return;
        }
      };

      timer.current = setInterval(
        () => setElapsed(Date.now() - start.current),
        100,
      );
      poller.current = setInterval(() => void tick(), POLL_INTERVAL);
      void tick();
    },
    [ingest, stopTimers],
  );

  const handleRun = useCallback(
    async (selection?: { products?: string[]; competitors?: string[] }) => {
      if (!store) {
        onError.current?.("Connect a store before running simulations.");
        return;
      }

      stopTimers();
      const run = generation.current;
      setPhase("running");
      setLogs([]);
      setStats(initialStats);
      setStatuses(initialStatuses);
      setModelStats({});
      setWinRates({});
      setTopFinding(null);
      setCount(0);
      setElapsed(0);
      shown.current = 0;
      start.current = Date.now();

      // Two attempts: a lone blip on a user-initiated click should recover
      // silently, and idempotent enqueue makes the repeat safe. Whatever still
      // fails after that is persistent enough to surface — and to report.
      const enqueue = await callWithRetry(
        () =>
          Simulate.enqueueScan({
            store,
            products: selection?.products,
            competitors: selection?.competitors,
          }),
        { attempts: 2, transportMessage: ENQUEUE_TRANSPORT_MESSAGE },
      );

      // The user reset or restarted while enqueue was in the air — this run's
      // outcome is no longer anyone's to act on.
      if (generation.current !== run) return;

      if (!enqueue.success) {
        stopTimers();
        setPhase("pre");
        if (enqueue.error instanceof TransportError) {
          Sentry.captureException(enqueue.error);
        }
        onError.current?.(enqueue.error.message);
        return;
      }

      setScanId(enqueue.data.scanId);
      poll(enqueue.data.scanId);
    },
    [poll, stopTimers, store],
  );

  // Resume an in-flight scan for this store started in a previous visit — the
  // background drain keeps it running while the user is away, so reopening the
  // page picks it up.
  useEffect(() => {
    if (!store) return;

    let active = true;
    const run = generation.current;

    void (async () => {
      // A transport blip here would silently park a running scan behind the
      // pre-scan screen, so the lookup gets a few tries. A failure after that
      // only means we could not tell whether a scan was already running —
      // there is nothing to resume and nothing to report. The generation check
      // covers the user starting a run of their own mid-retry, which `active`
      // (unmount only) would miss.
      const inFlight = await callWithRetry(() => Scan.getInFlight({ store }), {
        attempts: 3,
      });
      if (
        !active ||
        generation.current !== run ||
        !inFlight.success ||
        !inFlight.data
      )
        return;

      setScanId(inFlight.data.id);
      setPhase("running");
      shown.current = 0;
      start.current = inFlight.data.createdAt.getTime();
      poll(inFlight.data.id);
    })();

    return () => {
      active = false;
    };
  }, [poll, store]);

  return {
    phase,
    stats,
    logs,
    statuses,
    modelStats,
    winRates,
    topFinding,
    scanId,
    count,
    elapsed,
    handleRun,
    isRunning: phase === "running",
    reset,
  } as const;
};
