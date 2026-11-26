import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
  normalizeResearchText,
  type ShoppingResearch,
  shoppingResearchSchema,
} from "@/lib/outbound-shopping-research";

const record = z.record(z.string(), z.unknown());
const corpusSchema = z
  .object({
    version: z.literal(1),
    sourceCommit: z.string(),
    exportedAt: z.string().datetime(),
    originalSelectionAt: z.string().datetime(),
    heldProspects: z.array(z.string()).length(21),
    hatProspect: z.string(),
    comparisonReceiptIds: z.array(z.string()),
    prospects: z.array(z.object({ id: z.string() }).passthrough()),
    jobs: z.array(
      z
        .object({
          id: z.string(),
          prospect_id: z.string().nullable(),
          status: z.string(),
          input: z.object({ operation: z.string() }).passthrough(),
          output: z
            .object({
              answer: z.unknown(),
              browser: z.unknown(),
              receipt: z.unknown(),
            })
            .passthrough(),
          created_at: z.string(),
        })
        .passthrough(),
    ),
    revisions: z.array(record),
    attempts: z.array(record),
    policy: record,
  })
  .passthrough();

export type FrozenCorpus = z.infer<typeof corpusSchema>;
export type FrozenCase = {
  id: string;
  prospect: string;
  group: "hat" | "held-first-email" | "historical-comparison";
  receipt: ShoppingResearch;
  original: FrozenCorpus["jobs"][number];
  capture: FrozenCorpus["jobs"][number] | null;
  fingerprint: string;
};

export const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const freeze = <Value>(value: Value): Value => {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};

const rawSchema = z
  .object({
    body: z.string(),
    sha256: z.string().length(64),
    receivedAt: z.string().datetime(),
  })
  .passthrough();
const captureSchema = z.object({ raw: z.array(rawSchema) }).passthrough();

/** Reads only the exported file. It does not import a database or provider. */
export const loadFrozenCorpus = async (path: string, expected: string) => {
  const content = await readFile(path, "utf8");
  const actual = createHash("sha256").update(content).digest("hex");
  if (actual !== expected)
    throw new Error(
      "Frozen corpus checksum changed; retain the original export.",
    );
  return freeze(corpusSchema.parse(JSON.parse(content)));
};

export const inspectFrozenCorpus = (corpus: FrozenCorpus) => {
  if (new Set(corpus.heldProspects).size !== 21)
    throw new Error(
      "Frozen cohort must contain 21 distinct original prospects.",
    );
  const identifiers = new Set(corpus.prospects.map((prospect) => prospect.id));
  if (
    [...corpus.heldProspects, corpus.hatProspect].some(
      (id) => !identifiers.has(id),
    )
  )
    throw new Error("Frozen corpus is missing an original cohort prospect.");
  const raw = corpus.jobs.flatMap((job) =>
    [job.output.answer, job.output.browser].flatMap((capture) =>
      capture ? captureSchema.parse(capture).raw : [],
    ),
  );
  for (const capture of raw) {
    const hash = createHash("sha256").update(capture.body).digest("hex");
    if (hash !== capture.sha256)
      throw new Error(
        "A saved raw capture no longer matches its original hash.",
      );
  }
  const cases = corpus.jobs.flatMap((job): FrozenCase[] => {
    if (job.input.operation !== "leadResearch" || !job.output.receipt)
      return [];
    const group = (() => {
      if (job.prospect_id === corpus.hatProspect) return "hat";
      if (job.prospect_id && corpus.heldProspects.includes(job.prospect_id))
        return "held-first-email";
      if (corpus.comparisonReceiptIds.includes(job.id))
        return "historical-comparison";
      return null;
    })();
    if (!group || !job.prospect_id) return [];
    const receipt = shoppingResearchSchema.parse(job.output.receipt);
    const sources = new Map(
      receipt.sources.map((source) => [source.id, source]),
    );
    if (sources.size !== receipt.sources.length)
      throw new Error(`Duplicate source IDs in frozen receipt ${job.id}.`);
    if (
      receipt.selected.quotes.some(
        (quote) =>
          !normalizeResearchText(
            sources.get(quote.sourceId)?.content ?? "",
          ).includes(normalizeResearchText(quote.quote)),
      )
    )
      throw new Error(
        `Frozen receipt ${job.id} contains a quote absent from its saved source.`,
      );
    const capture =
      corpus.jobs.find((candidate) => {
        if (
          candidate.prospect_id !== job.prospect_id ||
          !candidate.output.answer ||
          !candidate.output.browser
        )
          return false;
        const artifacts = [
          candidate.output.answer,
          candidate.output.browser,
        ].flatMap((value) =>
          captureSchema
            .parse(value)
            .raw.map((entry) => `sha256:${entry.sha256}`),
        );
        return receipt.sources.every((source) =>
          artifacts.includes(source.artifact),
        );
      }) ?? null;
    return [
      freeze({
        id: job.id,
        prospect: job.prospect_id,
        group,
        receipt,
        original: job,
        capture,
        fingerprint: fingerprint(job.output.receipt),
      }),
    ];
  });
  if (
    corpus.comparisonReceiptIds.some(
      (id) => !cases.some((entry) => entry.id === id),
    )
  )
    throw new Error(
      "A historical comparison receipt is missing from the frozen cases.",
    );
  if (
    corpus.heldProspects.some(
      (id) => !cases.some((entry) => entry.prospect === id),
    )
  )
    throw new Error(
      "An original held prospect has no frozen research receipt.",
    );
  return {
    cases,
    rawArtifacts: raw.length,
    uniqueRawArtifacts: new Set(raw.map((capture) => capture.sha256)).size,
    providerBoundCases: cases.filter((entry) => entry.capture).length,
    sourceTextOnlyCases: cases.filter((entry) => !entry.capture).length,
  };
};

type Hold = { status: "held"; reason: string };
type Ready<Value> = { status: "ready"; value: Value };
export type OfflineStages<Assessment, Sequence> = {
  assess: (entry: FrozenCase, at: string) => Promise<Hold | Ready<Assessment>>;
  write: (
    entry: FrozenCase,
    assessment: Assessment,
    at: string,
  ) => Promise<Hold | Ready<Sequence>>;
  gate: (
    entry: FrozenCase,
    sequence: Sequence,
    at: string,
  ) => Promise<{ pass: boolean; reason: string }>;
};

/** Inject the checked assessment/writer/gate adapters; run under no-network.ts. */
export const evaluateFrozenCase = async <Assessment, Sequence>(
  entry: FrozenCase,
  at: string,
  stages: OfflineStages<Assessment, Sequence>,
) => {
  const research = await stages.assess(entry, at);
  if (research.status === "held")
    return {
      id: entry.id,
      stage: "research",
      pass: false,
      reason: research.reason,
      fingerprint: entry.fingerprint,
    };
  const writing = await stages.write(entry, research.value, at);
  if (writing.status === "held")
    return {
      id: entry.id,
      stage: "writing",
      pass: false,
      reason: writing.reason,
      fingerprint: entry.fingerprint,
    };
  const sequence = freeze(writing.value);
  const verdict = await stages.gate(entry, sequence, at);
  return {
    id: entry.id,
    stage: "copy",
    ...verdict,
    sequence,
    fingerprint: entry.fingerprint,
    sequenceFingerprint: fingerprint(sequence),
  };
};
