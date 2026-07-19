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
