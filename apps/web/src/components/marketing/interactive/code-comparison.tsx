"use client";

import { CheckIcon, CodeIcon } from "@zenncore/icons";
import { cn, resultify } from "@zenncore/utils";
import { Button } from "@zenncore/web/components/button";
import Image from "next/image";
import { useMessages } from "next-intl";
import { useState } from "react";
import { EvolvingAscii } from "@/components/marketing/evolving-ascii";
import { Plus } from "@/components/plus";
import { FormattedSourceTokens } from "./published-files/formatted-source";
import { sourceDiff } from "./source-diff";

const recordSource = (
  rows: readonly CodeRecord.Row[],
  state: CodeRecord.State,
) =>
  JSON.stringify(
    Object.fromEntries(rows.map((row) => [row.key, row[state]])),
    null,
    2,
  );

/** One complete, readable diff; unchanged facts remain visible without interaction. */
export const CodeDiff = ({
  rows,
  filename,
  label,
  before,
  after,
}: CodeDiff.Props) => {
  const messages = useMessages();
  const copy = messages.reviewDiff;
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const original = recordSource(rows, "before");
  const updated = recordSource(rows, "after");
  const lines = sourceDiff(original, updated);
  const added = lines.filter((line) => line.kind === "added").length;
  const removed = lines.filter((line) => line.kind === "removed").length;
  return (
    <section
      aria-label={label}
      data-code-diff=""
      className="relative min-w-0 bg-emphasis-dimmed text-background-rich"
    >
      <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
      <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
      <Plus className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
      <Plus className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
      <header className="flex flex-wrap items-center justify-between gap-4 border-background-rich/15 border-b px-8 py-6 max-sm:px-4">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-4 font-mono text-sm">
            <CodeIcon
              aria-hidden
              className="size-4 shrink-0 text-primary-rich"
            />
            <span className="min-w-0 break-all">{filename}</span>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-4 text-background-rich/55 text-xs">
            <span>{copy.view}</span>
            <span className="text-success-rich">
              <span className="sr-only">{copy.added}: </span>+{added}
            </span>
            <span className="text-error-rich">
              <span className="sr-only">{copy.removed}: </span>−{removed}
            </span>
          </p>
        </div>
        <Button
          color="emphasis"
          onClick={async () => {
            const result = await resultify(() =>
              navigator.clipboard.writeText(updated),
            );
            setCopied(result.success ? "copied" : "failed");
          }}
        >
          {copied === "copied" ? (
            <>
              <CheckIcon aria-hidden className="size-4" />
              {copy.copyState.copied}
            </>
          ) : copied === "failed" ? (
            copy.copyState.failed
          ) : (
            copy.action.primary
          )}
        </Button>
      </header>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-background-rich/10 border-b px-8 py-4 text-background-rich/55 text-xs max-sm:px-4">
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-error-rich">
            −
          </span>
          {before ?? copy.removed}
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-success-rich">
            +
          </span>
          {after ?? copy.added}
        </span>
        <span className="ml-auto max-sm:ml-0">{copy.unchanged}</span>
      </div>
      <pre className="min-w-0 py-6 font-mono text-xs leading-6 max-sm:text-xs">
        <code>
          {lines.map((line) => (
            <span
              key={`${line.kind}-${line.before ?? ""}-${line.after ?? ""}`}
              data-diff-line={line.kind}
              data-before-line={line.before}
              data-after-line={line.after}
              className={cn(
                "grid min-w-0 grid-cols-[2.5rem_2.5rem_1.5rem_minmax(0,1fr)] px-4 max-sm:grid-cols-[1.5rem_1.5rem_1.25rem_minmax(0,1fr)] max-sm:px-2",
                line.kind === "added" && "bg-success/8",
                line.kind === "removed" && "bg-error/10",
              )}
            >
              <span
                aria-hidden
                className="select-none pr-3 text-right text-background-rich/35 max-sm:pr-1"
              >
                {line.before}
              </span>
              <span
                aria-hidden
                className="select-none pr-3 text-right text-background-rich/35 max-sm:pr-1"
              >
                {line.after}
              </span>
              <span
                aria-hidden
                className={cn(
                  "select-none text-center",
                  line.kind === "added"
                    ? "text-success-rich"
                    : "text-error-rich",
                )}
              >
                {line.kind === "added"
                  ? "+"
                  : line.kind === "removed"
                    ? "−"
                    : " "}
              </span>
              <span className="whitespace-pre-wrap break-words text-background-rich/80 [overflow-wrap:anywhere]">
                {line.kind !== "context" && (
                  <span className="sr-only">
                    {line.kind === "added" ? copy.added : copy.removed}:{" "}
                  </span>
                )}
                <FormattedSourceTokens source={line.source} />
              </span>
            </span>
          ))}
        </code>
      </pre>
      <div className="border-background-rich/15 border-t px-8 py-6 max-sm:px-4">
        <p className="mb-4 text-background-rich/50 text-xs">
          {copy.annotations}
        </p>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-x-8 gap-y-6">
          {rows.map((row) => (
            <div key={row.key} className="min-w-0">
              <dt className="mb-2 break-all font-mono text-primary-rich text-xs">
                {row.key}
              </dt>
              <dd className="max-w-[48ch] text-background-rich/65 text-sm leading-relaxed">
                {row.note}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p role="status" className="sr-only">
        {copied === "idle" ? "" : copy.copyState[copied]}
      </p>
    </section>
  );
};

export namespace CodeDiff {
  export type Props = {
    rows: readonly CodeRecord.Row[];
    filename: string;
    label: string;
    before?: string;
    after?: string;
  };
}

export namespace CodeRecord {
  export type State = "before" | "after";
  export type Value =
    | string
    | number
    | boolean
    | null
    | readonly Value[]
    | { readonly [key: string]: Value };
  export type Row = { key: string; before: Value; after: Value; note: string };
}

export const AnnotatedCodeComparison = ({
  title,
  sampleLabel,
  before,
  after,
  note,
  filename,
  rows,
  image,
}: AnnotatedCodeComparison.Props) => (
  <div
    data-code-comparison
    className="relative min-w-0 border-accent-foreground border-t"
  >
    <Plus className="top-0 left-0 -translate-x-1/2 -translate-y-1/2" />
    <Plus className="top-0 right-0 translate-x-1/2 -translate-y-1/2" />
    <header className="flex items-center gap-6 px-8 py-8 max-sm:gap-4 max-sm:px-4">
      {image && (
        <div
          className={cn(
            "relative size-24 shrink-0 overflow-hidden rounded-sm max-sm:size-20",
            image.artwork
              ? "bg-emphasis-dimmed p-2 text-primary-rich"
              : "bg-background-rich",
          )}
        >
          {image.artwork ? (
            <EvolvingAscii artwork={image.artwork} />
          ) : (
            <Image
              src={image.src}
              alt=""
              fill
              sizes="96px"
              className="object-contain p-2"
            />
          )}
        </div>
      )}
      <div className="min-w-0">
        <p className="mb-2 text-primary-text text-sm">{sampleLabel}</p>
        <h3 className="text-2xl">{title}</h3>
        {image && (
          <p className="mt-2 max-w-[60ch] text-foreground-dimmed text-xs leading-relaxed">
            {image.caption}
          </p>
        )}
      </div>
    </header>
    <CodeDiff
      rows={rows}
      filename={filename}
      label={title}
      before={before}
      after={after}
    />
    <p className="border-accent-foreground border-t px-8 py-6 text-foreground-dimmed text-sm leading-relaxed max-sm:px-4">
      {note}
    </p>
  </div>
);

export namespace AnnotatedCodeComparison {
  export type Props = {
    title: string;
    sampleLabel: string;
    before: string;
    after: string;
    note: string;
    filename: string;
    rows: readonly CodeRecord.Row[];
    image?: { src: string; caption: string; artwork?: EvolvingAscii.Kind };
  };
}
