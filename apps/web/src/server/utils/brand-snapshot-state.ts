import type * as BrandSnapshot from "../app/brand-snapshot";

export const BRAND_RUNNING_STALE_MS = 10 * 60 * 1000;

/** The caller supplies the latest attempt, regardless of its status. */
export const isBrandSnapshotRunning = (
  snapshot: BrandSnapshot.Type | null | undefined,
  now: number,
): snapshot is BrandSnapshot.Type =>
  Boolean(
    snapshot?.status === "running" &&
      now - snapshot.createdAt.getTime() < BRAND_RUNNING_STALE_MS,
  );

/** A killed background run needs a recovery state, not an endless spinner. */
export const resolveBrandSnapshotState = (
  snapshots: {
    complete: BrandSnapshot.Type | null;
    running: BrandSnapshot.Type | null;
    failed: BrandSnapshot.Type | null;
  },
  now: number,
) => {
  const { complete, running, failed } = snapshots;
  const newerThanReport = (snapshot: BrandSnapshot.Type) =>
    !complete || snapshot.createdAt > complete.createdAt;
  const active =
    running &&
    newerThanReport(running) &&
    (!failed || running.createdAt > failed.createdAt) &&
    isBrandSnapshotRunning(running, now)
      ? running
      : null;
  const interrupted = Boolean(
    running &&
      newerThanReport(running) &&
      !active &&
      (!failed || running.createdAt > failed.createdAt),
  );
  return {
    complete,
    running: active,
    failed: failed && newerThanReport(failed) ? failed : null,
    interrupted,
  };
};
