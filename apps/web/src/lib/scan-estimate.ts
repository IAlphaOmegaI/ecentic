/**
 * Wall-clock model for a scan, shared by the engine and the UI so the estimate
 * shown before a run and the actual run speed come from the same numbers.
 *
 * The engine (background-scan.ts) keeps SCAN_CONCURRENCY judge tasks in flight
 * at a time; each task position-swaps one product/competitor pair through one
 * model (2 parallel calls). Wall time has three parts:
 *
 *   startup + slowest straggler task + simulations / steady-state throughput
 *
 * The startup term covers enqueue -> drain kick -> engine boot (first result
 * consistently lands ~10s after the scan row is created). The straggler term
 * exists because a run ends on its slowest task — in practice a Gemini
 * (thinking) call at 25-40s — which dominates small scans that a pure
 * throughput model would wildly underestimate. Calibrated against measured
 * runs: 6 sims -> 38s, 36 -> 82s, 900 -> 1237s.
 */
export const SCAN_CONCURRENCY = 12;

export const AVERAGE_SIMULATION_SECONDS = 16;

/**
 * Model perspectives a scan runs each pair through.
 *
 * Must match `perspectives` in background-scan.ts. The server passes its own
 * `perspectives.length` into the counters below rather than trusting this, so
 * the engine cannot drift from itself; this constant exists for the client,
 * which cannot import a server module and was hardcoding `* 3` in two places.
 */
export const PERSPECTIVE_COUNT = 3;

/**
 * Simulations a scan will run.
 *
 * Takes competitors PER PRODUCT rather than a store-wide total because pairing
 * is not necessarily uniform: a product with its own measured competitor offers
 * is judged against those, not against the entire roster. Summing the shaped
 * pair graph is the only count that stays correct in both regimes.
 *
 * This is the single definition. It previously lived in three places — the
 * engine and both client estimates — each independently multiplying by a
 * hardcoded 3, which is a drift waiting to happen the moment pairing changes.
 */
export const countSimulations = (
  competitorsPerProduct: readonly number[],
  perspectives: number = PERSPECTIVE_COUNT,
) =>
  competitorsPerProduct.reduce((total, count) => total + count, 0) *
  perspectives;

/** The uniform case: every product judged against the same roster. */
export const countUniformSimulations = (
  products: number,
  competitors: number,
  perspectives: number = PERSPECTIVE_COUNT,
) => products * competitors * perspectives;

const STARTUP_SECONDS = 10;

const STRAGGLER_TASK_SECONDS = 30;

export const estimateScanSeconds = (simulations: number) =>
  Math.ceil(
    STARTUP_SECONDS +
      STRAGGLER_TASK_SECONDS +
      (simulations * AVERAGE_SIMULATION_SECONDS) / SCAN_CONCURRENCY,
  );

export const formatScanEstimate = (simulations: number) => {
  const seconds = estimateScanSeconds(simulations);

  switch (true) {
    case simulations <= 0:
      return "—";
    case seconds < 60:
      return `~${Math.ceil(seconds / 10) * 10} sec`;
    case seconds < 3600:
      return `~${Math.ceil(seconds / 60)} min`;
    default:
      return `~${Math.floor(seconds / 3600)} h ${Math.ceil((seconds % 3600) / 60)} min`;
  }
};
