"use client";

import { ArrowRightIcon, CommerceCode_3Icon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { ScrollArea } from "@zenncore/web/components/scroll-area";
import type { AppConfig } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { MarketingEdgeCrosses } from "@/components/marketing/light-band";
import { useDocument } from "@/hooks/use-document";
import { useInteractive } from "../use-interactive";
import { FormattedSource } from "./formatted-source";

const readPreview = async (response: Response) => {
  if (!response.ok || !response.body) throw new Error("File unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  const decode = () => {
    const decoder = new TextDecoder();
    return (
      chunks.map((part) => decoder.decode(part, { stream: true })).join("") +
      decoder.decode()
    );
  };
  const limit = 65_536;
  const read = async (size = 0): Promise<string> => {
    const chunk = await reader.read();
    if (chunk.done) return decode();
    chunks.push(chunk.value.slice(0, Math.max(0, limit - size)));
    if (size + chunk.value.length >= limit) {
      await reader.cancel();
      return decode();
    }
    return read(size + chunk.value.length);
  };
  const source = await read();
  const parsed = await resultify(() => JSON.parse(source));
  const formatted = parsed.success
    ? JSON.stringify(parsed.data, null, 2)
    : source;
  return formatted
    .split("\n")
    .slice(0, 30)
    .map((line) => line.slice(0, 2000))
    .join("\n");
};

export const PublishedFilePreview = ({
  path,
  copy,
}: {
  path: string;
  copy: AppConfig["Messages"]["interactiveFiles"];
}) => {
  const { window } = useDocument();
  const { ready, reduced } = useInteractive();
  const controller = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{ text: string; time: string } | null>(
    null,
  );
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "failed">(
    "idle",
  );
  const fetchFile = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState("loading");
    setResult(null);
    const reading = await resultify(async () =>
      readPreview(
        await fetch(path, {
          signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
          headers: { Accept: "text/plain, application/json, */*" },
          cache: "no-store",
        }),
      ),
    );
    if (request.signal.aborted || controller.current !== request) return;
    if (!reading.success) {
      setState("failed");
      return;
    }
    setResult({ text: reading.data, time: new Date().toISOString() });
    setState("loaded");
  }, [path]);
  useEffect(() => {
    if (ready && !reduced) void fetchFile();
    return () => controller.current?.abort();
  }, [ready, reduced, fetchFile]);
  return (
    <div className="min-w-0" data-file-preview={path}>
      <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-4 border-accent-foreground border-b px-6 py-5 max-sm:flex-col max-sm:items-stretch max-sm:px-4">
        <MarketingEdgeCrosses edge="bottom" />
        <a
          className="flex min-w-0 flex-1 items-center gap-3 font-mono text-primary-text text-sm underline-offset-4 hover:underline max-sm:w-full"
          href={path}
        >
          <CommerceCode_3Icon className="size-6 shrink-0" aria-hidden />
          <span className="break-all">
            {window ? `${window.location.origin}${path}` : path}
          </span>
          <ArrowRightIcon className="size-4 shrink-0 -rotate-45" aria-hidden />
        </a>
        {ready && (
          <Button
            color="neutral"
            className="max-sm:self-start"
            onClick={() => void fetchFile()}
            disabled={state === "loading"}
          >
            {copy.action.primary}
          </Button>
        )}
      </div>
      <div className="relative min-w-0 bg-emphasis-dimmed bg-radial-[at_100%_0%] from-primary-dimmed via-transparent to-transparent">
        {result ? (
          <ScrollArea
            role="region"
            aria-label={copy.preview}
            className="h-96 min-w-0 max-w-full"
            classList={{
              viewport:
                "focus-visible:outline-2 focus-visible:outline-primary-rich focus-visible:-outline-offset-4",
            }}
          >
            <FormattedSource source={result.text} />
          </ScrollArea>
        ) : (
          <div className="flex min-h-96 flex-col justify-center gap-4 px-8 py-8 text-background-rich/80 max-sm:px-4">
            <CommerceCode_3Icon
              className="size-10 text-primary-rich"
              aria-hidden
            />
            <p className="max-w-[50ch]">
              {state === "failed"
                ? copy.failed
                : state === "loading"
                  ? copy.loading
                  : copy.idle}
            </p>
          </div>
        )}
      </div>
      <div className="relative border-accent-foreground border-t px-6 py-5 max-sm:px-4">
        <MarketingEdgeCrosses />
        <p className="text-foreground text-xs" role="status">
          {result ? (
            <>
              {copy.fetched}{" "}
              <time className="font-mono" dateTime={result.time}>
                {result.time}
              </time>
            </>
          ) : state === "failed" ? (
            copy.failed
          ) : state === "loading" ? (
            copy.loading
          ) : (
            copy.idle
          )}
        </p>
        <p className="mt-2 max-w-[70ch] text-foreground-dimmed text-xs">
          {copy.limit}
        </p>
      </div>
    </div>
  );
};
