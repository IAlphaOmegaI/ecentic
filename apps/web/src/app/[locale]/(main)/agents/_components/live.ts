"use client";

import { resultify } from "@zenncore/utils";
import { useEffect, useState } from "react";
import type * as Catalog from "@/server/app/storefront/catalog";

// Copy on every /agents surface is hardcoded English tonight, like the internal
// /dev pages, so the shared message catalogs stay untouched.

/** What `GET /api/agents/runs/[id]` returns: `now` lets the stage absorb clock skew. */
export type Snapshot = { summary: Catalog.Summary; now: number };

type Poll<T> = {
  data: T | null;
  /** Client clock when `data` arrived. */
  receivedAt: number | null;
  /** The last read was a 404. */
  missing: boolean;
  /** The last read failed for any other reason. Earlier `data` stays on screen. */
  failed: boolean;
};

const read = async <T>(url: string, signal: AbortSignal) => {
  const response = await resultify(() =>
    fetch(url, { cache: "no-store", signal }),
  );
  if (!response.success) return { kind: "failed" as const };
  if (response.data.status === 404) return { kind: "missing" as const };
  if (!response.data.ok) return { kind: "failed" as const };

  const body = await resultify(() => response.data.json());
  if (!body.success) return { kind: "failed" as const };

  return { kind: "ok" as const, data: body.data as T };
};

/**
 * Reads `url` until `until` says the answer is final. The next read is scheduled
 * only once the last one lands, so a slow route never stacks requests. A failed
 * read keeps what is on screen and tries again: a blip must not blank a stage
 * screen. `until` must be stable (declare it at module scope), and a null `url`
 * waits.
 */
export const usePoll = <T>(
  url: string | null,
  { interval, until }: usePoll.Options<T>,
) => {
  const [state, setState] = useState<Poll<T>>({
    data: null,
    receivedAt: null,
    missing: false,
    failed: false,
  });

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    const { signal } = controller;

    const tick = async () => {
      const outcome = await read<T>(url, signal);
      if (signal.aborted) return;

      const receivedAt = Date.now();
      setState((previous) => {
        switch (outcome.kind) {
          case "ok":
            return {
              data: outcome.data,
              receivedAt,
              missing: false,
              failed: false,
            };
          case "missing":
            return { ...previous, missing: true, failed: false };
          default:
            return { ...previous, missing: false, failed: true };
        }
      });

      if (outcome.kind === "ok" && until?.(outcome.data)) return;

      setTimeout(() => {
        if (!signal.aborted) void tick();
      }, interval);
    };

    void tick();

    return () => controller.abort();
  }, [url, interval, until]);

  return state;
};

export namespace usePoll {
  export type Options<T> = {
    interval: number;
    until?: (data: T) => boolean;
  };
}

const MERGE_WATCH = 3 * 60 * 1000;

/**
 * Nothing about this run can change any more. Runs keep moving after `done`:
 * an offer goes from accepted to merged and an upload finishes processing, and
 * the stage screen shows both as they land. The merge watch gives up well inside
 * {@link MERGE_WATCH}, so a line still `accepted` after that will not move.
 */
export const settled = ({ summary, now }: Snapshot) => {
  if (summary.stage === "failed") return true;
  if (summary.stage !== "done") return false;

  const watching =
    summary.finishedAt === null || now - summary.finishedAt <= MERGE_WATCH;
  const waiting =
    watching &&
    (summary.merchant?.lines ?? []).some(
      (line) => line.status === "pending" || line.status === "accepted",
    );
  const uploading =
    summary.upload?.status === "uploading" ||
    summary.upload?.status === "received" ||
    summary.upload?.status === "processing";

  return !waiting && !uploading;
};

export const count = (amount: number, singular: string, plural: string) =>
  `${amount} ${amount === 1 ? singular : plural}`;

export const channelLine = (
  label: string,
  { ready, total }: Catalog.Summary["google"],
) => `${label}: ${ready} of ${count(total, "product", "products")} ready`;

export const uploadLine = ({ status }: Catalog.Upload) =>
  `Uploaded to OpenAI's product feed: ${status.replaceAll("_", " ")}`;

export const stageLabels: Record<Catalog.Stage, string> = {
  reading: "Reading the store",
  preparing: "Fixing what we can",
  channels: "Building the feeds",
  done: "Done",
  failed: "This run stopped",
};

export const offerLabels: Record<Catalog.OfferLine["status"], string> = {
  pending: "Waiting on Google's API",
  accepted: "Accepted by Google's API",
  merged: "Merged by Google",
  rejected: "Rejected by Google's API",
  skipped: "Skipped",
};

/** What Google now shows once the override has merged, what we sent before that. */
export const offerTitle = ({
  status,
  mergedTitle,
  title,
}: Catalog.OfferLine) =>
  status === "merged" && mergedTitle ? mergedTitle : title;
