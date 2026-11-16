import { describe, expect, test } from "bun:test";
import type * as BrandSnapshot from "../app/brand-snapshot";
import {
  BRAND_RUNNING_STALE_MS,
  isBrandSnapshotRunning,
  resolveBrandSnapshotState,
} from "../utils/brand-snapshot-state";

const now = Date.UTC(2026, 10, 13, 12);
const snapshot = (
  status: BrandSnapshot.Type["status"],
  age: number,
): BrandSnapshot.Type => ({
  id: `${status}-${age}`,
  userId: "review-user",
  storeId: "review-store",
  status,
  report: null,
  error: null,
  createdAt: new Date(now - age),
  updatedAt: new Date(now - age),
});

describe("brand report recovery", () => {
  test("polling and duplicate-run checks accept only the latest fresh running attempt", () => {
    expect(isBrandSnapshotRunning(undefined, now)).toBe(false);
    expect(isBrandSnapshotRunning(snapshot("complete", 10_000), now)).toBe(
      false,
    );
    expect(isBrandSnapshotRunning(snapshot("failed", 10_000), now)).toBe(false);
    expect(isBrandSnapshotRunning(snapshot("running", 10_000), now)).toBe(true);
    expect(
      isBrandSnapshotRunning(snapshot("running", BRAND_RUNNING_STALE_MS), now),
    ).toBe(false);
  });
  test("an untouched store is empty, not failed or running", () => {
    expect(
      resolveBrandSnapshotState(
        { complete: null, running: null, failed: null },
        now,
      ),
    ).toEqual({
      complete: null,
      running: null,
      failed: null,
      interrupted: false,
    });
  });

  test("a fresh run preserves the previous report during refresh", () => {
    const complete = snapshot("complete", 3_600_000);
    const running = snapshot("running", 60_000);
    const result = resolveBrandSnapshotState(
      { complete, running, failed: null },
      now,
    );
    expect(result.complete).toBe(complete);
    expect(result.running).toBe(running);
    expect(result.interrupted).toBe(false);
  });

  test("a killed run at the timeout boundary becomes recoverable", () => {
    const running = snapshot("running", BRAND_RUNNING_STALE_MS);
    const result = resolveBrandSnapshotState(
      { complete: null, running, failed: null },
      now,
    );
    expect(result.running).toBeNull();
    expect(result.interrupted).toBe(true);
  });

  test("an interrupted refresh never discards the last completed report", () => {
    const complete = snapshot("complete", 3_600_000);
    const result = resolveBrandSnapshotState(
      {
        complete,
        running: snapshot("running", BRAND_RUNNING_STALE_MS),
        failed: null,
      },
      now,
    );
    expect(result.complete).toBe(complete);
    expect(result.interrupted).toBe(true);
  });

  test("a failed refresh keeps its older completed report", () => {
    const complete = snapshot("complete", 3_600_000);
    const failed = snapshot("failed", 60_000);
    const result = resolveBrandSnapshotState(
      { complete, running: null, failed },
      now,
    );
    expect(result.complete).toBe(complete);
    expect(result.failed).toBe(failed);
  });

  test("a completed report supersedes old failures and abandoned runs", () => {
    const complete = snapshot("complete", 10_000);
    const result = resolveBrandSnapshotState(
      {
        complete,
        running: snapshot("running", 20_000),
        failed: snapshot("failed", 30_000),
      },
      now,
    );
    expect(result.running).toBeNull();
    expect(result.failed).toBeNull();
    expect(result.interrupted).toBe(false);
  });

  test("a newer failure supersedes an orphaned fresh running row", () => {
    const failed = snapshot("failed", 10_000);
    const result = resolveBrandSnapshotState(
      { complete: null, running: snapshot("running", 20_000), failed },
      now,
    );
    expect(result.failed).toBe(failed);
    expect(result.running).toBeNull();
    expect(result.interrupted).toBe(false);
  });

  test("a stale retry is interrupted even if an earlier attempt failed", () => {
    const result = resolveBrandSnapshotState(
      {
        complete: null,
        running: snapshot("running", BRAND_RUNNING_STALE_MS),
        failed: snapshot("failed", 3_600_000),
      },
      now,
    );
    expect(result.running).toBeNull();
    expect(result.interrupted).toBe(true);
  });
});
