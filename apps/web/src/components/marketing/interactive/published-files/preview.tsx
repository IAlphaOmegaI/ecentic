"use client";

import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import type { AppConfig } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDocument } from "@/hooks/use-document";
import { useInteractive } from "../use-interactive";

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
  return source
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
    <div className="px-8 py-8 max-sm:px-4" data-file-preview={path}>
      <a
        className="break-all font-mono text-primary-text underline underline-offset-4"
        href={path}
      >
        {window ? `${window.location.origin}${path}` : path}
      </a>
      <p className="mt-4 text-foreground text-sm" role="status">
        {state === "failed" ? (
          copy.failed
        ) : state === "loading" ? (
          copy.loading
        ) : result ? (
          <>
            {copy.fetched} <time dateTime={result.time}>{result.time}</time>
          </>
        ) : (
          copy.idle
        )}
      </p>
      {ready && (
        <div className="mt-4">
          <Button
            variant="outline"
            color="neutral"
            onClick={() => void fetchFile()}
            disabled={state === "loading"}
          >
            {copy.action.primary}
          </Button>
        </div>
      )}
      {result && (
        <section
          // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users must be able to scroll the bounded code preview.
          tabIndex={0}
          aria-label={copy.preview}
          className="mt-6 max-h-96 overflow-auto border border-accent-foreground bg-background px-6 py-6"
        >
          <pre className="whitespace-pre-wrap break-words font-mono text-foreground-rich text-sm leading-relaxed">
            {result.text}
          </pre>
        </section>
      )}
      <p className="mt-4 text-foreground text-sm">{copy.limit}</p>
    </div>
  );
};
