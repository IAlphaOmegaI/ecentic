"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  LoaderIcon,
} from "@zenncore/icons";
import { cn, resultify, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import { Button } from "@zenncore/web/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@zenncore/web/components/collapsible";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { useState } from "react";
import {
  Crosshair,
  SectionKicker,
  StatusPill,
} from "@/app/[locale]/(main)/dashboard/_components/grid";
import { useDocument } from "@/hooks/use-document";
import type * as Discovery from "@/server/app/intelligence/discovery-run";
import type * as Prospect from "@/server/app/intelligence/prospect";
import * as Scan from "@/server/app/intelligence/prospect-scan";
import {
  BLOCKS,
  DONTS,
  fill,
  NO_FINDING_EMAIL,
  objections,
  type Placeholders,
} from "./script";

// ---------------------------------------------------------------------------
// Small shared pieces
// ---------------------------------------------------------------------------

const Label = ({ children }: { children: string }) => (
  <span className="block font-medium text-[10px] text-foreground-dimmed uppercase tracking-[0.08em]">
    {children}
  </span>
);

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const { window } = useDocument();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  return (
    <Button
      size="icon"
      variant="ghost"
      color="accent"
      aria-label={label}
      className="size-7 shrink-0 text-foreground-dimmed"
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

const Field = ({
  label,
  value,
  onValueChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}) => (
  <div>
    <Label>{label}</Label>
    <TextField value={value} onValueChange={onValueChange} className="mt-2">
      <TextFieldInput
        placeholder={placeholder}
        className={cn(mono && "font-mono")}
      />
    </TextField>
  </div>
);

// ---------------------------------------------------------------------------
// Column 1 — findings
// ---------------------------------------------------------------------------

const FAILURE_COPY: Record<Prospect.ScanFailure["kind"], string> = {
  "invalid-url": "That isn't a store address I can read. Check the spelling.",
  unreachable:
    "The site didn't answer. It may be down, or blocking us at the network level — either way there is nothing verified to say yet.",
  blocked:
    "The store answered with a bot wall, so nothing could be read. This is NOT the same as the store having no data — do not say it is.",
  timeout: "The site took too long to answer. Try again before you dial.",
  "not-a-store":
    "The site is up, but no product pages were found. Either it isn't a store, or the product pages live somewhere the scan didn't look.",
};

const FailureNotice = ({ failure }: { failure: Prospect.ScanFailure }) => (
  <div className="border border-warning/40 bg-warning/5 p-4">
    <StatusPill tone="warning">Scan incomplete</StatusPill>
    <p className="mt-3 text-foreground text-sm">{FAILURE_COPY[failure.kind]}</p>
    {failure.kind === "blocked" && (
      <p className="mt-2 font-mono text-foreground-dimmed text-xs">
        HTTP {failure.status}
      </p>
    )}
    {failure.kind === "unreachable" && (
      <p className="mt-2 font-mono text-foreground-dimmed text-xs">
        {failure.detail}
      </p>
    )}
  </div>
);

const FindingCard = ({
  finding,
  index,
}: {
  finding: Prospect.ProspectFinding;
  index: number;
}) => (
  <div className="border border-accent-foreground bg-background-rich">
    <div className="flex items-start gap-3 border-accent-foreground border-b px-4 py-3">
      <span className="mt-0.5 font-mono font-semibold text-primary text-sm tabular-nums">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground text-sm">{finding.plain}</p>
        <p className="mt-0.5 font-mono text-[11px] text-foreground-dimmed tabular-nums">
          {finding.coverage.affected} of {finding.coverage.checked} checked
        </p>
      </div>
      <CopyButton
        value={`${finding.plain}\n\n${finding.consequence}`}
        label="Copy the plain-language version"
      />
    </div>

    <div className="px-4 py-3">
      <p className="text-foreground-dimmed text-sm">{finding.consequence}</p>

      <Collapsible className="group mt-3">
        <CollapsibleTrigger className="flex w-fit cursor-pointer items-center gap-1 font-medium text-primary-text text-xs underline-offset-2 hover:underline">
          <ChevronRightIcon
            aria-hidden
            className="size-3 transition-transform group-data-open:rotate-90"
          />
          Evidence — {finding.evidence.length}{" "}
          {finding.evidence.length === 1 ? "page" : "pages"}
        </CollapsibleTrigger>
        <CollapsiblePanel className="justify-start bg-transparent">
          <div className="mt-2 space-y-2">
            {finding.evidence.map((entry) => (
              <div
                key={entry.url}
                className="border border-accent-foreground bg-background-dimmed p-2"
              >
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-mono text-[11px] text-primary-text underline-offset-2 hover:underline"
                >
                  {entry.url}
                </a>
                <p className="mt-1.5 text-[10px] text-foreground-dimmed">
                  Parsed structured data, reformatted — open the URL above to
                  read it as they published it.
                </p>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-foreground-dimmed">
                  {entry.snippet}
                </pre>
              </div>
            ))}
            {finding.reference && (
              <a
                href={finding.reference}
                target="_blank"
                rel="noreferrer"
                className="block font-mono text-[11px] text-foreground-dimmed underline-offset-2 hover:underline"
              >
                Platform documentation for this rule ↗
              </a>
            )}
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  </div>
);

const EmptyState = ({ values }: { values: Placeholders }) => (
  <div className="border border-accent-foreground bg-background-rich p-5">
    <StatusPill tone="warning">Nothing verified</StatusPill>
    <p className="mt-3 font-medium text-base text-foreground-rich">
      No verified finding. Don't call — ask them to name a product first.
    </p>
    <p className="mt-2 text-foreground-dimmed text-sm">
      The scan reached the store and read its pages. It found nothing worth
      interrupting someone over, and a call with no finding is a call that
      teaches them to ignore the next one. Send this instead.
    </p>
    <div className="mt-4 border border-accent-foreground bg-background-dimmed p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground text-xs">
          {fill(NO_FINDING_EMAIL.subject, values)}
        </p>
        <CopyButton
          value={`${fill(NO_FINDING_EMAIL.subject, values)}\n\n${fill(NO_FINDING_EMAIL.body, values)}`}
          label="Copy the email"
        />
      </div>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] text-foreground-dimmed">
        {fill(NO_FINDING_EMAIL.body, values)}
      </pre>
    </div>
  </div>
);

const crawlerTone = (access: Prospect.CrawlerAccess) => {
  switch (access) {
    case "blocked":
      return "error" as const;
    case "allowed":
      return "success" as const;
    default:
      return "neutral" as const;
  }
};

const CrawlerRow = ({ crawlers }: { crawlers: Prospect.CrawlerStatus[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {crawlers.map((crawler) => (
      <StatusPill key={crawler.id} tone={crawlerTone(crawler.access)}>
        {`${crawler.label} · ${crawler.access}`}
      </StatusPill>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// The AI shelf — fenced off from the verified findings on purpose
// ---------------------------------------------------------------------------

const AgentShelf = ({
  domain,
  suggestions,
}: {
  domain: string;
  suggestions: string[];
}) => {
  const [queries, setQueries] = useState(suggestions.join("\n"));
  const [result, setResult] = useState<Discovery.DiscoveryRunResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [handleRun, isRunning] = useAsyncAction(async () => {
    setError(null);
    setResult(null);

    const parsed = queries
      .split("\n")
      .map((query) => query.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (parsed.length === 0) {
      setError("Add at least one shopper query.");
      return;
    }

    const response = await resultify(() =>
      unwrapResult(
        Scan.runAgentShelf({ targetStore: domain, queries: parsed }),
      ),
    );

    if (!response.success) {
      setError(response.error.message);
      return;
    }

    setResult(response.data);
  });

  return (
    <div className="border border-primary/30 bg-primary/[0.03] p-4">
      <StatusPill tone="primary">Live model run</StatusPill>
      <p className="mt-3 font-medium text-foreground text-sm">
        What four models name when a shopper asks
      </p>
      <p className="mt-1 text-foreground-dimmed text-xs">
        Reproducible on the call — you can re-run it while they watch. It is{" "}
        <strong className="font-medium text-foreground">not</strong> checkable
        in their page source, so keep it out of the findings above and never
        present it as something they can verify themselves.
      </p>

      <Textarea value={queries} onValueChange={setQueries} className="mt-3">
        <TextareaInput
          rows={3}
          placeholder="One shopper query per line"
          className="font-mono text-xs"
        />
      </Textarea>

      <Button
        color="primary"
        variant="outline"
        className="mt-3 gap-2"
        onClick={handleRun}
        disabled={isRunning}
      >
        {isRunning && <LoaderIcon className="size-4 animate-spin" />}
        {isRunning ? "Asking the models…" : "Run the shelf"}
      </Button>

      {error && <p className="mt-3 text-error text-sm">{error}</p>}

      {result?.queries.map((query) => (
        <div key={query.query} className="mt-4">
          <p className="font-mono text-[11px] text-foreground-dimmed">
            “{query.query}”
          </p>
          <div className="mt-1.5 space-y-1">
            {query.models.map((model) => (
              <div
                key={model.model}
                className="flex items-start gap-2 border-accent-foreground border-t pt-1.5 first:border-t-0"
              >
                <span className="w-28 shrink-0 font-medium text-foreground text-xs">
                  {model.modelLabel}
                </span>
                <StatusPill tone={model.targetIncluded ? "success" : "error"}>
                  {model.targetIncluded
                    ? `ranked ${model.targetRank ?? "?"}`
                    : "not named"}
                </StatusPill>
                <span className="min-w-0 flex-1 text-[11px] text-foreground-dimmed">
                  {model.status === "error" ? model.error : model.targetReason}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Column 2 — the script
// ---------------------------------------------------------------------------

const ScriptBlock = ({
  block,
  values,
}: {
  block: (typeof BLOCKS)[number];
  values: Placeholders;
}) => (
  <Collapsible
    defaultOpen={block.open}
    className="group border border-accent-foreground bg-background-rich"
  >
    <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left hover:bg-background-dimmed/40">
      <ChevronRightIcon
        aria-hidden
        className="size-3.5 shrink-0 text-foreground-dimmed transition-transform group-data-open:rotate-90"
      />
      <span className="font-medium text-foreground text-sm">{block.title}</span>
      {!block.open && <StatusPill tone="neutral">only if they ask</StatusPill>}
    </CollapsibleTrigger>
    <CollapsiblePanel className="justify-start bg-transparent">
      <div className="space-y-3 border-accent-foreground border-t px-4 py-3">
        {block.lines.map((line) => {
          const spoken = fill(line, values);
          return (
            <div key={line} className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[15px] text-foreground leading-relaxed">
                {spoken}
              </p>
              <CopyButton value={spoken} label="Copy this line" />
            </div>
          );
        })}
        {block.note && (
          <p className="text-foreground-dimmed text-xs italic">{block.note}</p>
        )}
      </div>
    </CollapsiblePanel>
  </Collapsible>
);

const Objections = ({ values }: { values: Placeholders }) => (
  <div className="space-y-2">
    <SectionKicker>Objections</SectionKicker>
    {objections(values).map((objection) => (
      <Collapsible
        key={objection.id}
        className="group border border-accent-foreground bg-background-rich"
      >
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left hover:bg-background-dimmed/40">
          <ChevronRightIcon
            aria-hidden
            className="size-3.5 shrink-0 text-foreground-dimmed transition-transform group-data-open:rotate-90"
          />
          <span className="font-medium text-foreground text-sm">
            {objection.title}
          </span>
        </CollapsibleTrigger>
        <CollapsiblePanel className="justify-start bg-transparent">
          <div className="space-y-3 border-accent-foreground border-t px-4 py-3">
            {objection.lines.map((line) => (
              <div key={line} className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[15px] text-foreground leading-relaxed">
                  {line}
                </p>
                <CopyButton value={line} label="Copy this line" />
              </div>
            ))}
            {objection.note && (
              <p className="text-foreground-dimmed text-xs italic">
                {objection.note}
              </p>
            )}
          </div>
        </CollapsiblePanel>
      </Collapsible>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

type Phase = "idle" | "running" | "done";

export const CallSheetClient = () => {
  const [store, setStore] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [rep, setRep] = useState("");
  const [email, setEmail] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<string[]>([]);
  const [scan, setScan] = useState<Prospect.ProspectScan | null>(null);
  const [crawlers, setCrawlers] = useState<Prospect.CrawlerStatus[]>([]);
  const [failure, setFailure] = useState<Prospect.ScanFailure | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leadFinding = scan?.findings[0] ?? null;

  const values: Placeholders = {
    rep,
    contact,
    company: company || scan?.domain || "",
    // The script says a page name out loud, so prefer a real scanned product
    // title over the domain.
    product: scan?.productTitles[0] ?? "",
    finding: leadFinding?.plain ?? "",
    email,
  };

  const [handleScan, isScanning] = useAsyncAction(async () => {
    setPhase("running");
    setLog([]);
    setScan(null);
    setCrawlers([]);
    setFailure(null);
    setError(null);

    const response = await resultify(async () => {
      const { output } = await unwrapResult(Scan.runProspectScan({ store }));

      for await (const event of readStreamableValue(output)) {
        if (!event) continue;

        switch (event.kind) {
          case "status": {
            setLog((previous) => [...previous, event.message]);
            break;
          }
          case "crawlers": {
            setCrawlers(event.crawlers);
            break;
          }
          case "pages": {
            setLog((previous) => [
              ...previous,
              `Found ${event.urls.length} product pages via ${event.source}`,
            ]);
            break;
          }
          case "page_checked": {
            setLog((previous) => [
              ...previous,
              `${event.hasProduct ? "read" : "no product data"} — ${event.url}`,
            ]);
            break;
          }
          case "error": {
            setFailure(event.failure);
            break;
          }
          case "done": {
            setScan(event.scan);
            break;
          }
        }
      }
    });

    setPhase("done");

    if (!response.success) setError(response.error.message);
  });

  return (
    <>
      {/* Inputs */}
      <div className="-mx-8 border-accent-foreground border-b">
        <div className="relative mx-8 px-6 py-6 sm:px-8">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />

          <div className="grid gap-4 lg:grid-cols-5">
            <Field
              label="Store address"
              value={store}
              onValueChange={setStore}
              placeholder="example.com"
              mono
            />
            <Field
              label="Contact first name"
              value={contact}
              onValueChange={setContact}
              placeholder="Alex"
            />
            <Field
              label="Company"
              value={company}
              onValueChange={setCompany}
              placeholder="Example Co"
            />
            <Field
              label="Your name"
              value={rep}
              onValueChange={setRep}
              placeholder="Sam"
            />
            <Field
              label="Their email"
              value={email}
              onValueChange={setEmail}
              placeholder="alex@example.com"
              mono
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button
              color="primary"
              className="gap-2"
              onClick={handleScan}
              disabled={isScanning || !store.trim()}
            >
              {isScanning && <LoaderIcon className="size-4 animate-spin" />}
              {isScanning ? "Scanning…" : "Scan the store"}
            </Button>
            {phase === "running" && log.length > 0 && (
              <span className="truncate font-mono text-[11px] text-foreground-dimmed">
                {log[log.length - 1]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="-mx-8 grid lg:grid-cols-2">
        {/* Findings */}
        <div className="relative mx-8 space-y-4 px-6 py-8">
          <Crosshair className="bottom-0 left-0 -translate-x-1/2 translate-y-1/2" />
          <SectionKicker>01 — What you can say</SectionKicker>

          {crawlers.length > 0 && <CrawlerRow crawlers={crawlers} />}

          {error && (
            <div className="border border-error/40 bg-error/5 p-4 text-error text-sm">
              {error}
            </div>
          )}

          {failure && <FailureNotice failure={failure} />}

          {phase === "idle" && (
            <p className="text-foreground-dimmed text-sm">
              Nothing scanned yet. Findings appear here with the URL each one
              came from.
            </p>
          )}

          {scan?.findings.map((finding, index) => (
            <FindingCard key={finding.kind} finding={finding} index={index} />
          ))}

          {phase === "done" && scan && scan.findings.length === 0 && (
            <EmptyState values={values} />
          )}

          {scan && scan.findings.length > 0 && (
            <AgentShelf
              domain={scan.domain}
              suggestions={scan.productTitles.slice(0, 2)}
            />
          )}

          {log.length > 0 && (
            <Collapsible className="group">
              <CollapsibleTrigger className="flex w-fit cursor-pointer items-center gap-1 font-mono text-[11px] text-foreground-dimmed underline-offset-2 hover:underline">
                <ChevronRightIcon
                  aria-hidden
                  className="size-3 transition-transform group-data-open:rotate-90"
                />
                Scan log ({log.length})
              </CollapsibleTrigger>
              <CollapsiblePanel className="justify-start bg-transparent">
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all border border-accent-foreground bg-background-dimmed p-2 font-mono text-[10px] text-foreground-dimmed">
                  {log.join("\n")}
                </pre>
              </CollapsiblePanel>
            </Collapsible>
          )}
        </div>

        {/* Script */}
        <div className="relative mx-8 space-y-4 border-accent-foreground px-6 py-8 lg:border-l">
          <Crosshair className="right-0 bottom-0 translate-x-1/2 translate-y-1/2" />
          <SectionKicker>02 — How you say it</SectionKicker>

          {BLOCKS.map((block) => (
            <ScriptBlock key={block.id} block={block} values={values} />
          ))}

          <Objections values={values} />

          <div className="sticky bottom-4 border border-foreground-rich/20 bg-background-rich p-3 shadow-sm">
            <Label>Whatever else happens</Label>
            <ul className="mt-2 space-y-1">
              {DONTS.map((line) => (
                <li key={line} className="text-foreground text-sm">
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};
