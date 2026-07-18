/**
 * Wall-clock model for a scan, shared by the engine and the UI so the estimate
 * shown before a run and the actual run speed come from the same numbers.
 *
 * The engine (background-scan.ts) keeps SCAN_CONCURRENCY judge tasks in flight
 * at a time; each task position-swaps one product/competitor pair through one
 * model (2 parallel calls) and takes AVERAGE_SIMULATION_SECONDS of wall time.
 * Throughput ≈ SCAN_CONCURRENCY / AVERAGE_SIMULATION_SECONDS simulations/sec.
 */
export const SCAN_CONCURRENCY = 12;

export const AVERAGE_SIMULATION_SECONDS = 15;

export const estimateScanSeconds = (simulations: number) =>
  Math.ceil((simulations * AVERAGE_SIMULATION_SECONDS) / SCAN_CONCURRENCY);

export const formatScanEstimate = (simulations: number) => {
  const seconds = estimateScanSeconds(simulations);

  switch (true) {
    case simulations <= 0:
      return "—";
    case seconds < 60:
      return `~${Math.max(10, Math.ceil(seconds / 10) * 10)} sec`;
    case seconds < 3600:
      return `~${Math.ceil(seconds / 60)} min`;
    default:
      return `~${Math.floor(seconds / 3600)} h ${Math.ceil((seconds % 3600) / 60)} min`;
  }
};
