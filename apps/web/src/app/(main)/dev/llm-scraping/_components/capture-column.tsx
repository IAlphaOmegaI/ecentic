"use client";

import { CheckIcon, CopyIcon, LoaderIcon } from "@zenncore/icons";
import { resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import { useState } from "react";
import { StatusPill } from "@/app/(main)/dashboard/_components/grid";
import { MessageResponse } from "@/components/ui/ai/message";
import { useDocument } from "@/hooks/use-document";
import {
  type Capture,
  type Citation,
  isRedirectWrapped,
  SURFACES,
  type Surface,
} from "@/lib/llm-scraping";

export type CaptureStatus = "queued" | "running" | "done" | "error" | "stopped";

export type CaptureState = {
  surface: Surface;
  runIndex: number;
  status: CaptureStatus;
  capture: Capture | null;
  error: string | null;
  // Total wall clock in ms, measured client-side — includes network and any
  // queueing on the provider side, unlike the capture's own latencyMs.
  duration: number | null;
};

export const BLANK_CAPTURE: CaptureState = {
  surface: "chatgpt",
  runIndex: 0,
  status: "queued",
  capture: null,
  error: null,
  duration: null,
};

const tones = {
  queued: "neutral",
  running: "primary",
  done: "success",
  error: "error",
  stopped: "warning",
} as const satisfies Record<
  CaptureStatus,
  "neutral" | "primary" | "success" | "error" | "warning"
>;

const seconds = (ms: number | null | undefined): string =>
  ms === null || ms === undefined
    ? "—"
    : ms < 1000
      ? `${Math.round(ms)}ms`
      : `${(ms / 1000).toFixed(2)}s`;

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.05em]">
      {label}
    </span>
    <span className="font-mono text-foreground-rich text-xs tabular-nums">
      {value}
    </span>
  </div>
);

const CopyButton = ({ value }: { value: string }) => {
  const { window } = useDocument();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  return (
    <Button
      size="icon"
      variant="ghost"
      color="accent"
      className="size-7 text-foreground-dimmed"
      onClick={() => {
        if (!window) return;
        void window.navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </Button>
  );
};

const hostOf = (url: string): string => {
  const parsed = resultify(() => new URL(url).host);
  return parsed.success ? parsed.data : url;
};

// ScrapeLLM's `url` is usually just the surface origin (chatgpt.com,
// google.com) — only a real conversation deep link is worth rendering.
const shareable = (url: string | null): string | null => {
  if (!url) return null;

  const parsed = resultify(() => new URL(url));
  if (!parsed.success) return null;

  return parsed.data.pathname === "/" && !parsed.data.search ? null : url;
};

const CitationList = ({ items }: { items: Citation[] }) => (
  <ol className="flex flex-col gap-2">
    {items.map((citation) => (
      <li
        key={`${citation.position}-${citation.url}`}
        className="flex gap-2 font-mono text-[11px]"
      >
        <span className="shrink-0 text-foreground-dimmed tabular-nums">
          {citation.position}.
        </span>
        <div className="min-w-0">
          {isRedirectWrapped(citation.url) ? (
            <span
              className="break-all text-foreground-rich"
              title="Google redirect — destination not recoverable"
            >
              {citation.title ?? citation.source ?? "unknown source"}
              {citation.source && (
                <span className="ml-1.5 text-foreground-dimmed">
                  · {citation.source}
                </span>
              )}
            </span>
          ) : (
            <a
              href={citation.url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-primary hover:underline"
            >
              {citation.title ?? hostOf(citation.url)}
            </a>
          )}
          {citation.snippet && (
            <p className="mt-0.5 text-foreground-dimmed">{citation.snippet}</p>
          )}
        </div>
      </li>
    ))}
  </ol>
);

const Section = ({
  label,
  open,
  children,
}: {
  label: string;
  open?: boolean;
  children: React.ReactNode;
}) => (
  <details className="border-accent-foreground border-l-2 pl-3" open={open}>
    <summary className="cursor-pointer font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.05em]">
      {label}
    </summary>
    <div className="mt-2">{children}</div>
  </details>
);

export const CaptureColumn = ({ state }: { state: CaptureState }) => {
  const surface = SURFACES[state.surface];
  const capture = state.capture;
  const answer = capture?.answerMarkdown ?? capture?.answerText ?? "";

  return (
    <div className="flex min-w-0 flex-col border border-accent-foreground bg-background">
      <div className="flex items-start justify-between gap-2 border-accent-foreground border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground-rich text-sm">
            {surface.label}
            <span className="ml-2 font-mono font-normal text-[11px] text-foreground-dimmed">
              run {state.runIndex + 1}
            </span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-foreground-dimmed">
            <span className={surface.accent}>scrapellm</span>
            <span className="mx-1.5 opacity-40">/</span>
            {state.surface}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <CopyButton value={answer} />
          <StatusPill tone={tones[state.status]}>
            {state.status === "running" && (
              <LoaderIcon className="size-3 animate-spin" />
            )}
            {state.status}
          </StatusPill>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 border-accent-foreground border-b bg-background-rich px-4 py-2.5">
        <Metric label="Total" value={seconds(state.duration)} />
        <Metric label="Scrape" value={seconds(capture?.latencyMs)} />
        <Metric
          label="Credits"
          value={capture?.costCredits?.toString() ?? "—"}
        />
        <Metric
          label="Cached"
          value={capture ? (capture.cached ? "yes" : "no") : "—"}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        {state.error && (
          <div className="border-error/30 border-l-2 bg-error/5 px-3 py-2">
            <p className="font-medium text-[10px] text-error uppercase tracking-[0.05em]">
              Error
            </p>
            <p className="mt-1 break-words font-mono text-error text-xs">
              {state.error}
            </p>
          </div>
        )}

        {state.status === "running" && (
          <p className="text-foreground-dimmed text-sm">
            Waiting for the surface to finish answering — ChatGPT with browsing
            can take a minute…
          </p>
        )}

        {answer && (
          <div className="prose-sm min-w-0 text-foreground text-sm">
            <MessageResponse>{answer}</MessageResponse>
          </div>
        )}

        {capture?.answerContent && (
          <Section label="Content only">
            <div className="prose-sm min-w-0 text-foreground text-sm">
              <MessageResponse>{capture.answerContent}</MessageResponse>
            </div>
          </Section>
        )}

        {capture && capture.shoppingCards.length > 0 && (
          <Section
            label={`Shopping cards — ${capture.shoppingCards.length}`}
            open
          >
            <ol className="flex flex-col gap-2">
              {capture.shoppingCards.map((card) => (
                <li
                  key={`${card.position}-${card.productName}`}
                  className="flex gap-2 font-mono text-[11px]"
                >
                  <span className="shrink-0 text-foreground-dimmed tabular-nums">
                    {card.position}.
                  </span>
                  <div className="min-w-0">
                    <p className="text-foreground-rich">{card.productName}</p>
                    {(card.price || card.merchant || card.rating) && (
                      <p className="mt-0.5 text-foreground">
                        {[card.price, card.merchant, card.rating]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {card.snippet && (
                      <p className="mt-0.5 text-foreground-dimmed">
                        {card.snippet}
                      </p>
                    )}
                    {card.offers && (
                      <p className="mt-0.5 text-foreground-dimmed">
                        offers:{" "}
                        {card.offers
                          .map((offer) =>
                            [offer.merchant, offer.price]
                              .filter(Boolean)
                              .join(" "),
                          )
                          .join(" · ")}
                      </p>
                    )}
                    {card.identifiers && (
                      <p className="mt-0.5 break-all text-foreground-dimmed opacity-70">
                        {Object.entries(card.identifiers)
                          .map(([key, value]) => `${key}:${value}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {capture && capture.citations.length > 0 && (
          <Section label={`Citations — ${capture.citations.length}`} open>
            <CitationList items={capture.citations} />
          </Section>
        )}

        {capture && capture.searchResults.length > 0 && (
          <Section label={`Search results — ${capture.searchResults.length}`}>
            <CitationList items={capture.searchResults} />
          </Section>
        )}

        {capture && (
          <Section label="Raw payload">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-foreground-dimmed">
              {JSON.stringify(capture.raw, null, 2)}
            </pre>
          </Section>
        )}
      </div>

      {(() => {
        const share = capture ? shareable(capture.shareUrl) : null;
        if (!capture || (!capture.model && !share)) return null;

        return (
          <p className="truncate border-accent-foreground border-t px-4 py-2 font-mono text-[11px] text-foreground-dimmed">
            {capture.model && <span>model: {capture.model}</span>}
            {capture.model && share && (
              <span className="mx-1.5 opacity-40">/</span>
            )}
            {share && (
              <a
                href={share}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                share link
              </a>
            )}
          </p>
        );
      })()}
    </div>
  );
};
