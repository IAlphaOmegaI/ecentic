"use client";

import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { readStreamableValue } from "@ai-sdk/rsc";
import { useState } from "react";
import * as Competitor from "@/server/app/competitor";

type Phase = "idle" | "scanning" | "done" | "error";

type LogLine = {
  id: number;
  text: string;
  elapsed: number;
};

export namespace AutoDetectTab {
  export type Props = {
    products: string[];
    onSuccess: (competitors: Competitor.Type[]) => void;
  };
}

export const AutoDetectTab = ({ products, onSuccess }: AutoDetectTab.Props) => {
  const toast = useToastManager();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (entry: LogEntry) =>
    setLogs((previous) => [...previous, entry]);

  const [handleDetect, isDetecting] = useAsyncAction(async () => {
    setLogs([]);

    const { output } = await Competitor.detectCompetitors({ products });

    for await (const event of readStreamableValue(output)) {
      if (!event) continue;

      switch (event.kind) {
        case "log":
          addLog({ text: event.text, type: "info" });
          break;
        case "error":
          addLog({ text: event.text, type: "error" });
          return;
        case "done":
          addLog({
            text: `${event.competitors.length} competitors ready`,
            type: "success",
          });
          onSuccess(event.competitors);
          toast.add({
            title: "Competitors found",
            description: `Found ${event.competitors.length} competitor products.`,
            type: "success",
          });
          return;
      }
    }
  });

  return (
    <div className="border border-accent-foreground border-t-0 bg-background-rich">
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="max-w-md font-light text-foreground-dimmed text-sm">
          We'll analyze your products and use AI to find the most relevant
          competitors in your market.
        </p>
        <Button
          variant="flat"
          color="primary"
          type="button"
          onClick={handleDetect}
          disabled={isDetecting}
          className="px-6 py-2 font-medium text-sm"
        >
          {isDetecting ? "Analyzing your market..." : "Auto-detect competitors"}
        </Button>
        {logs.length > 0 && (
          <div className="w-full max-w-sm space-y-1 text-left">
            {logs.map((log, index) => (
              <p
                // biome-ignore lint/suspicious/noArrayIndexKey: log index is unique
                key={index}
                className={
                  log.type === "error"
                    ? "text-error text-xs"
                    : log.type === "success"
                      ? "text-primary text-xs"
                      : "text-foreground-dimmed text-xs"
                }
              >
                {log.text}
              </p>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
