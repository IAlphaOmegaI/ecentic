"use client";

import { cn } from "@zenncore/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  offerTitle,
  type Snapshot,
  settled,
  useLiveCopy,
  usePoll,
} from "@/app/[locale]/(main)/agents/_components/live";
import { Motion } from "@/components/motion";
import type * as Catalog from "@/server/app/storefront/catalog";
import { StageSkeleton } from "./skeletons";

/** Enough to read from the back of the room and still fit 1080p. */
const VISIBLE_OFFERS = 5;

const format = (elapsed: number) => {
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor(elapsed / 1000) % 60;
  const tenths = Math.floor(elapsed / 100) % 10;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${tenths}`;
};

/**
 * Runs on the server's clock, not the laptop's. `now - receivedAt` is the skew
 * minus however long the response took, so the largest value seen is the closest
 * to the truth, and only ever moving it up keeps the digits from stepping back.
 */
const Timer = ({
  summary,
  now,
  receivedAt,
}: {
  summary: Catalog.Summary;
  now: number;
  receivedAt: number;
}) => {
  const [skew, setSkew] = useState(now - receivedAt);
  const [clock, setClock] = useState(receivedAt);
  const running = summary.finishedAt === null && summary.stage !== "failed";

  useEffect(() => {
    setSkew((previous) => Math.max(previous, now - receivedAt));
  }, [now, receivedAt]);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => setClock(Date.now()), 100);

    return () => clearInterval(interval);
  }, [running]);

  const end = (() => {
    switch (true) {
      case summary.finishedAt !== null:
        return summary.finishedAt;
      case !running:
        return now;
      default:
        return clock + skew;
    }
  })();

  return (
    <p
      role="timer"
      className="font-semibold text-[length:clamp(4rem,min(14vw,24vh),24rem)] text-foreground-rich tabular-nums leading-none tracking-tight"
    >
      {format(Math.max(0, end - summary.startedAt))}
    </p>
  );
};

const Message = ({ title, detail }: { title: string; detail: string }) => (
  <div className="flex h-full flex-col justify-center gap-[3vh] p-[clamp(1.5rem,4vw,5rem)]">
    <p className="font-semibold text-[length:clamp(2.5rem,6vw,7rem)] text-foreground-rich leading-tight tracking-tight">
      {title}
    </p>
    <p className="max-w-[60vw] text-[length:clamp(1.25rem,2.5vw,3rem)] text-foreground-dimmed">
      {detail}
    </p>
  </div>
);

const Line = ({ children }: { children: string }) => (
  <p className="truncate font-medium text-[length:clamp(1.75rem,min(3vw,5.4vh),4.5rem)] text-foreground-rich leading-tight">
    {children}
  </p>
);

const Offer = ({ line }: { line: Catalog.OfferLine }) => {
  const translate = useTranslations("agentReadiness");
  const { offerLabels } = useLiveCopy();
  const listing = line.destinations
    .find((destination) => destination.startsWith("FREE_LISTINGS"))
    ?.replace("FREE_LISTINGS", translate("presentation.freeListings"));
  return (
    <Motion.Up
      initial="hidden"
      animate="visible"
      className="flex items-baseline justify-between gap-[2vw] border-accent-foreground border-t pt-[0.8vh] text-[length:clamp(1rem,min(1.9vw,3.4vh),2.5rem)] leading-tight"
    >
      <span className="min-w-0 flex-1 truncate text-foreground-rich">
        {offerTitle(line)}
      </span>
      {listing && (
        <span className="shrink-0 text-foreground-dimmed">{listing}</span>
      )}
      <span
        className={cn(
          "shrink-0 font-medium",
          (line.status === "pending" || line.status === "skipped") &&
            "text-foreground-dimmed",
          line.status === "accepted" && "text-primary-rich",
          line.status === "merged" && "text-success-rich",
          line.status === "rejected" && "text-error-rich",
        )}
      >
        {offerLabels[line.status]}
      </span>
    </Motion.Up>
  );
};

export const Stage = ({ id }: Stage.Props) => {
  const translate = useTranslations("agentReadiness");
  const { channelLine, uploadLine, stageLabels } = useLiveCopy();
  const { data, receivedAt, missing, failed } = usePoll<Snapshot>(
    `/api/agents/runs/${id}`,
    { interval: 1000, until: settled },
  );

  if (!data && missing)
    return (
      <Message
        title={translate("notice.missingTitle")}
        detail={translate("presentation.missing")}
      />
    );

  if (!data && failed)
    return (
      <Message
        title={translate("presentation.waiting")}
        detail={translate("presentation.waitingBody")}
      />
    );

  if (!data || receivedAt === null) return <StageSkeleton />;

  const { summary, now } = data;
  const landed = (
    summary.merchant?.eligible ? summary.merchant.lines : []
  ).filter((line) => line.status !== "pending");

  return (
    <main className="flex h-full flex-col gap-[2vh] p-[clamp(1.5rem,3vw,5rem)]">
      <div className="flex items-baseline justify-between gap-[3vw] text-[length:clamp(1.25rem,min(2vw,3.6vh),3rem)] leading-tight">
        <p className="min-w-0 truncate font-medium text-foreground-rich">
          {summary.name ?? summary.host}
        </p>
        <p className="shrink-0 text-foreground-dimmed">
          {summary.stage === "reading"
            ? translate("presentation.reading", { count: summary.read })
            : stageLabels[summary.stage]}
        </p>
      </div>

      <Timer summary={summary} now={now} receivedAt={receivedAt} />

      {summary.stage === "failed" ? (
        <p className="text-[length:clamp(1.5rem,3vw,4rem)] text-error-rich leading-tight">
          {summary.error ?? translate("errors.finish")}
        </p>
      ) : (
        <div className="flex flex-col gap-[1vh]">
          <Line>{channelLine("Google & Gemini", summary.google)}</Line>
          <Line>{channelLine("ChatGPT", summary.chatgpt)}</Line>
          <p className="font-medium text-[length:clamp(1.75rem,min(3vw,5.4vh),4.5rem)] text-primary-rich tabular-nums leading-tight">
            {translate("presentation.fixes", { count: summary.fixes })}
          </p>
        </div>
      )}

      {summary.upload && (
        <Motion.Up
          initial="hidden"
          animate="visible"
          className="truncate text-[length:clamp(1.25rem,min(2vw,3.6vh),3rem)] text-foreground-rich leading-tight"
        >
          {uploadLine(summary.upload)}
        </Motion.Up>
      )}

      {landed.length > 0 && (
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-[0.8vh] overflow-hidden">
          {landed.slice(-VISIBLE_OFFERS).map((line) => (
            <Offer key={line.offerId} line={line} />
          ))}
        </div>
      )}
    </main>
  );
};

export namespace Stage {
  export type Props = {
    id: string;
  };
}
