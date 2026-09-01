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

/**
 * The client's copy of the judge panel size. The engine's `perspectives` array
 * binds model ids, so a client estimator cannot import it; server callers pass
 * their own `perspectives.length` to {@link countSimulations} instead and are
 * therefore always right, leaving drift here as a wrong estimate rather than a
 * wrong scan.
 */
export const PERSPECTIVE_COUNT = 3;

/**
 * Simulations a scan will run, from the shaped pair graph: one entry per
 * product, holding the number of competitors THAT product will be judged
 * against.
 *
 * It takes the graph rather than two scalars because pairing is uniform only
 * today. Every caller used to multiply `products * competitors * 3` on its own,
 * and the moment a product is paired with its own rivals instead of the whole
 * roster those copies drift apart — the progress bar stops reaching 100%, or
 * the UI promises a duration off by an order of magnitude.
 */
export const countSimulations = (
  competitorsPerProduct: readonly number[],
  perspectives: number = PERSPECTIVE_COUNT,
) =>
  competitorsPerProduct.reduce((total, competitors) => total + competitors, 0) *
  perspectives;

/** The pair graph for today's uniform pairing: every product against every competitor. */
export const uniformPairing = (products: number, competitors: number) =>
  Array.from({ length: products }, () => competitors);
