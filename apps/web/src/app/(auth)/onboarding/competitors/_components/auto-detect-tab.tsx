"use client";

import { resultify } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import { useToastManager } from "@zenncore/web/components/toast";
import { useState } from "react";
import type * as Competitor from "@/server/app/competitor";

type LogEntry = { text: string; type: "info" | "success" | "error" };

type StreamEvent =
  | { kind: "log"; text: string }
  | { kind: "error"; text: string }
  | { kind: "done"; competitors: Competitor.Type[] };

const readDetectStream = async (
  body: ReadableStream<Uint8Array>,
  onLog: (entry: LogEntry) => void,
): Promise<Competitor.Type[]> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();

  // let required: buffer accumulates across async stream iterations
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      const event = JSON.parse(line) as StreamEvent;

      switch (event.kind) {
        case "log":
          onLog({ text: event.text, type: "info" });
          break;
        case "error":
          throw new Error(event.text);
        case "done":
          onLog({
            text: `${event.competitors.length} competitors ready`,
            type: "success",
          });
          return event.competitors;
      }
    }
  }

  throw new Error("Stream ended without result");
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

    const response = await resultify(() =>
      fetch("/api/intelligence/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products }),
      }),
    );

    if (!response.success) {
      setLogs([{ text: "Request failed", type: "error" }]);
      return;
    }

    const { ok, body, status } = response.data;

    if (!ok || !body) {
      setLogs([{ text: `Request failed — HTTP ${status}`, type: "error" }]);
      return;
    }

    const stream = await resultify(() => readDetectStream(body, addLog));

    if (!stream.success) {
      addLog({ text: stream.error.message, type: "error" });
      return;
    }

    onSuccess(stream.data);
    toast.add({
      title: "Competitors found",
      description: `Found ${stream.data.length} competitor products.`,
      type: "success",
    });
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
      </div>
    </div>
  );
};
