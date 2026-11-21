"use client";

import { FileSearchIcon, LoaderIcon, XIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Progress, ProgressLabel } from "@zenncore/web/components/progress";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import * as Outbound from "@/server/app/outbound";
import * as Connections from "@/server/app/outbound/integrations";
import { Notice, useMutation } from "./common";

type PreparationProgress = {
  processed: number;
  verified: number;
  held: number;
  target: number;
  status:
    | "running"
    | "stopping"
    | "stopped"
    | "complete"
    | "shortfall"
    | "error";
};

export const PreparationBatch = ({ target }: { target: number }) => {
  const t = useTranslations("outbound.preparation");
  const router = useRouter();
  const mutation = useMutation();
  const control = useRef({ running: false, stop: false, mounted: true });
  const visited = useRef(new Set<string>());
  const verified = useRef(new Set<string>());
  const [remaining, setRemaining] = useState<number | null>(null);
  const [progress, setProgress] = useState<PreparationProgress | null>(null);
  const running =
    progress?.status === "running" || progress?.status === "stopping";

  useEffect(() => {
    control.current.mounted = true;
    return () => {
      control.current.stop = true;
      control.current.mounted = false;
    };
  }, []);

  const start = async () => {
    if (control.current.running) return;
    control.current.running = true;
    control.current.stop = false;
    const summary = {
      candidates: [] as string[],
      verified: [] as string[],
      target,
      received: false,
    };
    setProgress({
      processed: 0,
      verified: verified.current.size,
      held: 0,
      target,
      status: "running",
    });
    await mutation.run(Outbound.getPreparationSummary, (result) => {
      if (result) Object.assign(summary, result, { received: true });
    });
    if (!control.current.mounted) {
      control.current.running = false;
      return;
    }
    if (!summary.received) {
      control.current.running = false;
      setProgress((current) =>
        current ? { ...current, status: "error" } : current,
      );
      return;
    }
    const findings = new Set([...summary.verified, ...verified.current]);
    const queue = summary.candidates.filter((id) => !visited.current.has(id));
    const totals = {
      processed: 0,
      verified: findings.size,
      held: 0,
      target: summary.target,
    };
    const state = { cursor: 0, failed: false };
    setRemaining(queue.length);
    setProgress({
      ...totals,
      status: control.current.stop ? "stopping" : "running",
    });

    while (
      !control.current.stop &&
      control.current.mounted &&
      state.cursor < queue.length &&
      totals.verified < totals.target
    ) {
      const batch = queue.slice(
        state.cursor,
        state.cursor + Math.min(3, totals.target - totals.verified),
      );
      const response = { received: false };
      await mutation.run(
        () => Connections.prepareBatch({ prospectIds: batch }),
        (result) => {
          if (!result) return;
          response.received = true;
          state.cursor += batch.length;
          totals.processed += result.results.length;
          totals.held += result.held;
          for (const prospect of result.results) {
            visited.current.add(prospect.prospectId);
            if (prospect.status === "verified") {
              findings.add(prospect.prospectId);
              verified.current.add(prospect.prospectId);
            }
          }
          totals.verified = findings.size;
          if (control.current.mounted) {
            setRemaining(queue.filter((id) => !visited.current.has(id)).length);
            setProgress({
              ...totals,
              status: control.current.stop ? "stopping" : "running",
            });
          }
        },
      );
      if (!response.received) {
        state.failed = true;
        break;
      }
    }

    control.current.running = false;
    if (!control.current.mounted) return;
    const status = (() => {
      switch (true) {
        case state.failed:
          return "error" as const;
        case totals.verified >= totals.target:
          return "complete" as const;
        case Boolean(control.current.stop):
          return "stopped" as const;
        default:
          return "shortfall" as const;
      }
    })();
    setProgress({ ...totals, status });
    router.refresh();
  };

  return (
    <div className="basis-full space-y-4 border-accent-foreground border-t pt-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          variant="soft"
          color="neutral"
          disabled={running}
          onClick={start}
        >
          {running ? (
            <LoaderIcon
              aria-hidden
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <FileSearchIcon aria-hidden className="size-4" />
          )}
          {t("action.primary")}
        </Button>
        {running && (
          <Button
            variant="ghost"
            disabled={progress?.status === "stopping"}
            onClick={() => {
              control.current.stop = true;
              setProgress((current) =>
                current ? { ...current, status: "stopping" } : current,
              );
            }}
          >
            <XIcon aria-hidden className="size-4" />
            {t("action.secondary")}
          </Button>
        )}
        <p className="max-w-2xl text-foreground-dimmed text-xs leading-5">
          {t("description", { target })}
        </p>
      </div>
      {progress && (
        <div
          role="status"
          aria-live="polite"
          className="space-y-2 text-foreground-dimmed text-sm"
        >
          <Progress
            value={Math.min(progress.verified, progress.target)}
            max={progress.target}
            className="max-w-2xl space-y-3"
            classList={{
              track: "rounded-full",
              indicator:
                "h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none",
            }}
          >
            <ProgressLabel className="block font-normal text-foreground-dimmed text-sm">
              {t("progress", {
                processed: progress.processed,
                verified: progress.verified,
                held: progress.held,
                target: progress.target,
              })}
            </ProgressLabel>
          </Progress>
          {progress.status === "running" && <p>{t("running")}</p>}
          {progress.status === "stopping" && <p>{t("stopping")}</p>}
          {progress.status === "stopped" && <p>{t("stopped")}</p>}
          {progress.status === "complete" && <p>{t("complete")}</p>}
          {progress.status === "shortfall" && (
            <p>
              {t("shortfall", {
                remaining: Math.max(0, progress.target - progress.verified),
              })}
            </p>
          )}
          {progress.status === "error" && <Notice value={mutation.notice} />}
        </div>
      )}
      {!running && remaining === 0 && (
        <p className="text-foreground-dimmed text-sm">{t("empty")}</p>
      )}
    </div>
  );
};
