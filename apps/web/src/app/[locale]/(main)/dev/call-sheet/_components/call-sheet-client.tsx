"use client";

import { readStreamableValue } from "@ai-sdk/rsc";
import {
  AlertCircleIcon,
  BanIcon,
  CheckIcon,
  CodeIcon,
  CopyIcon,
  EnvelopeIcon,
  FileSearchIcon,
  GlobeIcon,
  GlobeSearchIcon,
  LoaderIcon,
  OfficeIcon,
  PhoneOutgoingIcon,
  QuoteIcon,
  RadarIcon,
  RobotIcon,
  UserIcon,
} from "@zenncore/icons";
import { cn, resultify, unwrapResult } from "@zenncore/utils";
import { useAsyncAction } from "@zenncore/utils/hooks";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@zenncore/web/components/accordion";
import { Button } from "@zenncore/web/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@zenncore/web/components/collapsible";
import { TextField, TextFieldInput } from "@zenncore/web/components/text-field";
import { Textarea, TextareaInput } from "@zenncore/web/components/textarea";
import { type ReactNode, useEffect, useState } from "react";
import {
  Band,
  SectionGutter,
  SectionHeader,
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

const OPEN_BLOCKS = BLOCKS.filter((block) => block.open).map(
  (block) => block.id,
);

const Mark = ({ children }: { children: ReactNode }) => (
  <span className="shrink-0 text-foreground-dimmed">{children}</span>
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
  icon,
  value,
  onValueChange,
  placeholder,
  mono,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  mono?: boolean;
}) => (
  <div>
    <span className="mb-1.5 flex items-center gap-1.5 text-foreground text-sm">
      <Mark>{icon}</Mark>
      {label}
    </span>
    <TextField value={value} onValueChange={onValueChange}>
      <TextFieldInput
        placeholder={placeholder}
        className={cn(mono && "font-mono")}
      />
    </TextField>
  </div>
);

const Spoken = ({
  text,
  onTextChange,
}: {
  text: string;
  onTextChange?: (value: string) => void;
}) => (
  <div className="flex items-start gap-3">
    {onTextChange ? (
      <Textarea
        value={text}
        onValueChange={onTextChange}
        className="min-w-0 flex-1"
      >
        <TextareaInput rows={3} />
      </Textarea>
    ) : (
      <p className="min-w-0 flex-1 text-base text-foreground leading-7">
        {text}
      </p>
    )}
    <CopyButton value={text} label="Copy this line" />
  </div>
);

const Note = ({ children }: { children: string }) => (
  <p className="text-foreground-dimmed text-sm leading-relaxed">{children}</p>
);

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
  <div className="border-warning/40 border-y bg-warning/5 px-6 py-4">
    <div className="flex items-center gap-2">
      <AlertCircleIcon aria-hidden className="size-4 text-warning" />
      <StatusPill tone="warning">Scan incomplete</StatusPill>
    </div>
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
  <Accordion
    multiple
    defaultValue={[finding.kind]}
    className="border-accent-foreground border-b bg-background-rich text-foreground"
  >
    <AccordionItem
      value={finding.kind}
      className="border-0 px-4 last:border-b-0"
    >
      <AccordionTrigger className="items-start py-3 text-sm">
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 font-medium text-primary text-sm tabular-nums">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="font-medium text-foreground text-sm">
              {finding.plain}
            </span>
            <span className="mt-0.5 block text-foreground-dimmed text-xs tabular-nums">
              {finding.coverage.affected} of {finding.coverage.checked} checked
            </span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionPanel className="text-foreground">
        <div className="space-y-4 pb-4">
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 text-foreground-dimmed text-sm leading-relaxed">
              {finding.consequence}
            </p>
            <CopyButton
              value={`${finding.plain}\n\n${finding.consequence}`}
              label="Copy the plain-language version"
            />
          </div>

          <Collapsible className="group w-full">
            <CollapsibleTrigger
              className="w-fit"
              render={<Button variant="outline" color="accent" />}
            >
              <FileSearchIcon aria-hidden className="size-4" />
              Evidence — {finding.evidence.length}{" "}
              {finding.evidence.length === 1 ? "page" : "pages"}
            </CollapsibleTrigger>
            <CollapsiblePanel className="w-full justify-start bg-transparent">
              <div className="mt-2 space-y-2">
                {finding.evidence.map((entry) => (
                  <div
                    key={entry.url}
                    className="border border-accent-foreground bg-background-dimmed p-3"
                  >
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-mono text-primary-text text-xs underline-offset-2 hover:underline"
                    >
                      {entry.url}
                    </a>
                    <p className="mt-1.5 text-foreground-dimmed text-xs">
                      Parsed structured data, reformatted — open the URL above
                      to read it as they published it.
                    </p>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-foreground-dimmed">
                      {entry.snippet}
                    </pre>
                  </div>
                ))}
                {finding.reference && (
                  <a
                    href={finding.reference}
                    target="_blank"
                    rel="noreferrer"
                    className="block font-mono text-foreground-dimmed text-xs underline-offset-2 hover:underline"
                  >
                    Platform documentation for this rule ↗
                  </a>
                )}
              </div>
            </CollapsiblePanel>
          </Collapsible>
        </div>
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
);

const EmptyState = ({ values }: { values: Placeholders }) => (
  <div className="border-accent-foreground border-y bg-background-rich p-5">
    <div className="flex items-center gap-2">
      <AlertCircleIcon aria-hidden className="size-4 text-warning" />
      <StatusPill tone="warning">Nothing verified</StatusPill>
    </div>
    <p className="mt-3 font-medium text-base text-foreground-rich">
      No verified finding. Don't call — ask them to name a product first.
    </p>
    <p className="mt-2 text-foreground-dimmed text-sm leading-relaxed">
      The scan reached the store and read its pages. It found nothing worth
      interrupting someone over, and a call with no finding is a call that
      teaches them to ignore the next one. Send this instead.
    </p>
    <div className="mt-4 border border-accent-foreground bg-background-dimmed p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-foreground text-sm">
          {fill(NO_FINDING_EMAIL.subject, values)}
        </p>
        <CopyButton
          value={`${fill(NO_FINDING_EMAIL.subject, values)}\n\n${fill(NO_FINDING_EMAIL.body, values)}`}
          label="Copy the email"
        />
      </div>
      <pre className="mt-2 whitespace-pre-wrap font-sans text-foreground-dimmed text-sm leading-relaxed">
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
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    const parsed = queries
      .split("\n")
      .map((query) => query.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (parsed.length === 0) {
      setIsRunning(false);
      setError("Add at least one shopper query.");
      setResult(null);
      return;
    }

    const request = { cancelled: false };
    const timeout = window.setTimeout(async () => {
      setIsRunning(true);
      setError(null);
      const response = await resultify(() =>
        unwrapResult(
          Scan.runAgentShelf({ targetStore: domain, queries: parsed }),
        ),
      );
      if (request.cancelled) return;
      setIsRunning(false);
      if (!response.success) {
        setError(response.error.message);
        return;
      }
      setResult(response.data);
    }, 400);

    return () => {
      request.cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [domain, queries]);

  return (
    <div className="border-primary/30 border-y bg-primary/3 p-4">
      <div className="flex items-center gap-2">
        <RobotIcon aria-hidden className="size-4 text-primary" />
        <StatusPill tone="primary">Live model run</StatusPill>
        {isRunning && (
          <span className="flex items-center gap-2 text-foreground-dimmed text-sm">
            <LoaderIcon className="size-4 animate-spin" />
            Asking the models…
          </span>
        )}
      </div>
      <p className="mt-3 font-medium text-foreground text-sm">
        What four models name when a shopper asks
      </p>
      <p className="mt-1 text-foreground-dimmed text-sm leading-relaxed">
        Runs as soon as the scan finishes. Edit the queries and it runs again.
        It is <strong className="font-medium text-foreground">not</strong>{" "}
        checkable in their page source, so keep it out of the findings above and
        never present it as something they can verify themselves.
      </p>

      <Textarea value={queries} onValueChange={setQueries} className="mt-3">
        <TextareaInput
          rows={3}
          placeholder="One shopper query per line"
          className="font-mono text-xs"
        />
      </Textarea>

      {error && <p className="mt-3 text-error text-sm">{error}</p>}

      {result?.queries.map((query) => (
        <div key={query.query} className="mt-4">
          <p className="text-foreground-dimmed text-xs">“{query.query}”</p>
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
                <span className="min-w-0 flex-1 text-foreground-dimmed text-xs">
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

const Script = ({ values }: { values: Placeholders }) => {
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  return (
    <>
      <div className="flex justify-end px-4 py-2">
        <Button
          variant="outline"
          color="accent"
          onClick={() => setEditing((previous) => !previous)}
        >
          {editing ? "Done" : "Edit script"}
        </Button>
      </div>
      <Accordion
        multiple
        defaultValue={OPEN_BLOCKS}
        className="w-full justify-start text-foreground"
      >
        {BLOCKS.map((block) => (
          <AccordionItem
            key={block.id}
            value={block.id}
            className="border-accent-foreground px-4 last:border-b-0"
          >
            <AccordionTrigger className="items-center py-4 text-sm">
              {block.title}
            </AccordionTrigger>
            <AccordionPanel className="text-foreground">
              <div className="space-y-4 pb-5">
                {block.lines.map((line) => {
                  const key = `${block.id}:${line}`;
                  const text = overrides[key] ?? fill(line, values);
                  return (
                    <Spoken
                      key={line}
                      text={text}
                      onTextChange={
                        editing
                          ? (value) =>
                              setOverrides((previous) => ({
                                ...previous,
                                [key]: value,
                              }))
                          : undefined
                      }
                    />
                  );
                })}
                {block.note && <Note>{block.note}</Note>}
              </div>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
};

const Objections = ({ values }: { values: Placeholders }) => (
  <Accordion multiple className="w-full justify-start text-foreground">
    {objections(values).map((objection) => (
      <AccordionItem
        key={objection.id}
        value={objection.id}
        className="border-accent-foreground px-4 last:border-b-0"
      >
        <AccordionTrigger className="items-center py-3.5 text-sm">
          {objection.title}
        </AccordionTrigger>
        <AccordionPanel className="text-foreground">
          <div className="space-y-4 pb-5">
            {objection.lines.map((line) => (
              <Spoken key={line} text={line} />
            ))}
            {objection.note && <Note>{objection.note}</Note>}
          </div>
        </AccordionPanel>
      </AccordionItem>
    ))}
  </Accordion>
);

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
      <Band>
        <div className="px-6 py-6 sm:px-8">
          <div className="grid gap-4 lg:grid-cols-5">
            <Field
              label="Store address"
              icon={<GlobeIcon aria-hidden className="size-4" />}
              value={store}
              onValueChange={setStore}
              placeholder="example.com"
              mono
            />
            <Field
              label="Contact first name"
              icon={<UserIcon aria-hidden className="size-4" />}
              value={contact}
              onValueChange={setContact}
              placeholder="Alex"
            />
            <Field
              label="Company"
              icon={<OfficeIcon aria-hidden className="size-4" />}
              value={company}
              onValueChange={setCompany}
              placeholder="Example Co"
            />
            <Field
              label="Your name"
              icon={<UserIcon aria-hidden className="size-4" />}
              value={rep}
              onValueChange={setRep}
              placeholder="Sam"
            />
            <Field
              label="Their email"
              icon={<EnvelopeIcon aria-hidden className="size-4" />}
              value={email}
              onValueChange={setEmail}
              placeholder="alex@example.com"
              mono
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button
              color="primary"
              className="gap-2"
              onClick={handleScan}
              disabled={isScanning || !store.trim()}
            >
              {isScanning ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <RadarIcon aria-hidden className="size-4" />
              )}
              {isScanning ? "Scanning…" : "Scan the store"}
            </Button>
            {phase === "running" && log.length > 0 && (
              <span className="truncate text-foreground-dimmed text-sm">
                {log[log.length - 1]}
              </span>
            )}
          </div>
        </div>
      </Band>

      <div className="border-accent-foreground border-b">
        <SectionGutter />
      </div>

      <div className="grid lg:grid-cols-2">
        <section className="min-w-0 border-accent-foreground lg:border-r">
          <SectionHeader
            icon={<FileSearchIcon aria-hidden className="size-4" />}
            title="What you can say"
            description="Only what the scan actually found, with the URL it came from."
          />

          {crawlers.length > 0 && (
            <div className="border-accent-foreground border-b px-6 py-4">
              <CrawlerRow crawlers={crawlers} />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 border-accent-foreground border-y px-6 py-4 text-error text-sm">
              <AlertCircleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          )}

          {failure && <FailureNotice failure={failure} />}

          {phase === "idle" && (
            <div className="flex items-start gap-2.5 px-6 py-6">
              <GlobeSearchIcon
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-foreground-dimmed"
              />
              <p className="text-foreground-dimmed text-sm leading-relaxed">
                Nothing scanned yet. Findings appear here with the URL each one
                came from.
              </p>
            </div>
          )}

          {scan?.findings.map((finding, index) => (
            <FindingCard key={finding.kind} finding={finding} index={index} />
          ))}

          {phase === "done" && scan && scan.findings.length === 0 && (
            <EmptyState values={values} />
          )}

          {scan && scan.findings.length > 0 && (
            <AgentShelf
              key={scan.domain}
              domain={scan.domain}
              suggestions={scan.productTitles.slice(0, 2)}
            />
          )}

          {log.length > 0 && (
            <Collapsible className="group w-full px-6 py-4">
              <CollapsibleTrigger
                className="w-fit"
                render={<Button variant="outline" color="accent" />}
              >
                <CodeIcon aria-hidden className="size-4" />
                Scan log ({log.length})
              </CollapsibleTrigger>
              <CollapsiblePanel className="w-full justify-start bg-transparent">
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all border border-accent-foreground bg-background-dimmed p-3 font-mono text-[11px] text-foreground-dimmed">
                  {log.join("\n")}
                </pre>
              </CollapsiblePanel>
            </Collapsible>
          )}
        </section>

        <section className="min-w-0">
          <SectionHeader
            icon={<PhoneOutgoingIcon aria-hidden className="size-4" />}
            title="How you say it"
            description="Read this out. Close a block after you've said it."
          />

          <div className="border-accent-foreground border-b px-4 py-4">
            <div className="flex items-center gap-2">
              <BanIcon aria-hidden className="size-4 text-foreground-dimmed" />
              <p className="text-foreground text-sm">Whatever else happens</p>
            </div>
            <ul className="mt-2 space-y-1">
              {DONTS.map((line) => (
                <li
                  key={line}
                  className="text-foreground-dimmed text-sm leading-relaxed"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="bg-background-rich">
              <Script
                key={`${scan?.domain ?? ""}:${leadFinding?.kind ?? ""}`}
                values={values}
              />
            </div>
            <div className="border-accent-foreground border-t bg-background-rich">
              <div className="flex items-center gap-2 px-4 pt-4">
                <QuoteIcon
                  aria-hidden
                  className="size-4 text-foreground-dimmed"
                />
                <p className="text-foreground-dimmed text-sm">Objections</p>
              </div>
              <Objections values={values} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
