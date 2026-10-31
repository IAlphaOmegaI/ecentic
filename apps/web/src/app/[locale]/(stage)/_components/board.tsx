"use client";

import { create } from "qrcode";
import { useSyncExternalStore } from "react";
import {
  count,
  stageLabels,
  usePoll,
} from "@/app/[locale]/(main)/agents/_components/live";
import { Motion } from "@/components/motion";
import type * as Catalog from "@/server/app/storefront/catalog";
import { BoardSkeleton } from "./skeletons";

/** What fits under the headline at 1080p without scrolling. */
const VISIBLE_RUNS = 8;

const subscribe = () => () => {};

/**
 * The QR as a single path, on the light plate a phone camera reads most
 * reliably. `bg-foreground-rich` and `fill-background` are the light and dark
 * ends of the stage's remapped tokens. The viewBox carries the four-module quiet
 * zone the spec requires.
 */
const Code = ({ url }: { url: string }) => {
  const { modules } = create(url, { errorCorrectionLevel: "M" });
  const path = Array.from(modules.data)
    .flatMap((filled, index) =>
      filled
        ? [
            `M${index % modules.size} ${Math.floor(index / modules.size)}h1v1h-1z`,
          ]
        : [],
    )
    .join("");

  return (
    <svg
      role="img"
      aria-label={`QR code for ${url}`}
      viewBox={`-4 -4 ${modules.size + 8} ${modules.size + 8}`}
      shapeRendering="crispEdges"
      className="size-full fill-background"
    >
      <path d={path} />
    </svg>
  );
};

const Readiness = ({
  label,
  channel,
}: {
  label: string;
  channel: Catalog.Summary["google"];
}) => (
  <span className="shrink-0 text-foreground-dimmed tabular-nums">
    {label}{" "}
    <span className="font-medium text-foreground-rich">
      {channel.ready} of {channel.total}
    </span>
  </span>
);

const Row = ({ run }: { run: Catalog.Summary }) => (
  <Motion.Up
    initial="hidden"
    animate="visible"
    className="flex items-baseline justify-between gap-[2vw] border-accent-foreground border-t pt-[1vh] text-[length:clamp(1rem,min(1.9vw,3.4vh),2.5rem)] leading-tight"
  >
    <span className="min-w-0 flex-1 truncate font-medium text-foreground-rich">
      {run.name ?? run.host}
    </span>
    {run.stage === "done" ? (
      <>
        <Readiness label="Google & Gemini" channel={run.google} />
        <Readiness label="ChatGPT" channel={run.chatgpt} />
      </>
    ) : (
      <span className="shrink-0 text-foreground-dimmed">
        {stageLabels[run.stage]}
      </span>
    )}
  </Motion.Up>
);

export const Board = () => {
  const { data, failed } = usePoll<Catalog.Board>("/api/agents/board", {
    interval: 3000,
  });
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => null,
  );

  if (!data && !failed) return <BoardSkeleton />;

  // A store we could not read has nothing to show the room. Its visitor saw why.
  const runs = (data?.runs ?? [])
    .filter((run) => run.stage !== "failed")
    .sort((left, right) => right.startedAt - left.startedAt)
    .slice(0, VISIBLE_RUNS);
  const url = origin ? `${origin}/agents` : null;

  return (
    <main className="flex h-full flex-col gap-[4vh] p-[clamp(1.5rem,4vw,5rem)]">
      <h1 className="text-balance font-semibold text-[length:clamp(2.5rem,min(5.4vw,9.6vh),7rem)] text-foreground-rich leading-[1.05] tracking-tight">
        <span className="text-primary-rich tabular-nums">
          {count(data?.stores ?? 0, "store", "stores")}
        </span>{" "}
        and{" "}
        <span className="text-primary-rich tabular-nums">
          {count(data?.products ?? 0, "product", "products")}
        </span>{" "}
        prepared for AI tonight
      </h1>

      <div className="flex min-h-0 flex-1 gap-[4vw]">
        <div className="flex shrink-0 flex-col gap-[1.5vh]">
          <div className="aspect-square h-[min(50vh,34vw)] overflow-hidden rounded-lg bg-foreground-rich">
            {url && <Code url={url} />}
          </div>
          <p className="max-w-[min(50vh,34vw)] break-all font-mono text-[length:clamp(0.875rem,min(1.3vw,2.3vh),1.75rem)] text-foreground-dimmed">
            {url}
          </p>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[1vh] overflow-hidden">
          {runs.map((run) => (
            <Row key={run.id} run={run} />
          ))}
          {runs.length === 0 && (
            <p className="text-[length:clamp(1.25rem,2.4vw,3rem)] text-foreground-dimmed">
              No stores yet. Scan the code and paste yours.
            </p>
          )}
        </div>
      </div>
    </main>
  );
};
