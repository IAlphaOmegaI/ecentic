"use client";

import { FileSearchIcon, LoaderIcon, XIcon } from "@zenncore/icons";
import { Button } from "@zenncore/web/components/button";
import { Progress, ProgressLabel } from "@zenncore/web/components/progress";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import type { Prospect } from "@/lib/outbound";
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

export const PreparationBatch = ({
  prospects,
  target,
}: {
  prospects: Prospect[];
  target: number;
}) => {
  const t = useTranslations("outbound.preparation");
  const router = useRouter();
  const mutation = useMutation();
  const control = useRef({ running: false, stop: false, mounted: true });
  const visited = useRef(new Set<string>());
  const verified = useRef(new Set<string>());
  const [completed, setCompleted] = useState(() => new Set<string>());
  const [progress, setProgress] = useState<PreparationProgress | null>(null);
  const candidates = prospects.filter(
    (prospect) =>
      prospect.status === "candidate" &&
      !prospect.evidence.trim() &&
      !completed.has(prospect.id),
  );
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
    const now = Date.now();
    const existing = prospects.filter((prospect) => {
      const checked = Date.parse(prospect.evidenceCheckedAt);
      return (
        ["candidate", "draft", "approved"].includes(prospect.status) &&
        prospect.relationship === "cold" &&
        prospect.evidence &&
        prospect.gap &&
        prospect.finding &&
        prospect.productUrl &&
        checked <= now &&
        now - checked < 86_400_000
      );
    });
    const findings = new Set([
      ...existing.map((prospect) => prospect.id),
      ...verified.current,
    ]);
    const queue = candidates
      .filter((prospect) => !visited.current.has(prospect.id))
      .map((prospect) => prospect.id);
    const totals = { processed: 0, verified: findings.size, held: 0, target };
    const state = { cursor: 0, failed: false };
    setProgress({ ...totals, status: "running" });

    while (
      !control.current.stop &&
      control.current.mounted &&
      state.cursor < queue.length &&
      totals.verified < target
    ) {
      const batch = queue.slice(
        state.cursor,
        state.cursor + Math.min(3, target - totals.verified),
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
            setCompleted(new Set(visited.current));
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
        case totals.verified >= target:
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
          disabled={running || !candidates.length}
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
      {!progress && !candidates.length && (
        <p className="text-foreground-dimmed text-sm">{t("empty")}</p>
      )}
    </div>
  );
};
