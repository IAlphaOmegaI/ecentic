import { readFile } from "node:fs/promises";
import {
  inspectFrozenCorpus,
  loadFrozenCorpus,
} from "../../src/server/spec/helpers/outbound-rebuild";

const [path, checksum] = process.argv.slice(2);
if (!path || !checksum)
  throw new Error(
    "Usage: bun rebuild-corpus.ts <frozen-corpus.private.json> <frozen-corpus.sha256>",
  );
const digest = (await readFile(checksum, "utf8")).trim().split(/\s+/)[0];
if (!digest) throw new Error("Frozen corpus checksum is missing.");
const corpus = await loadFrozenCorpus(path, digest);
const inspection = inspectFrozenCorpus(corpus);
console.log(
  JSON.stringify(
    {
      sourceCommit: corpus.sourceCommit,
      exportedAt: corpus.exportedAt,
      originalSelectionAt: corpus.originalSelectionAt,
      rawArtifacts: inspection.rawArtifacts,
      uniqueRawArtifacts: inspection.uniqueRawArtifacts,
      providerBoundCases: inspection.providerBoundCases,
      sourceTextOnlyCases: inspection.sourceTextOnlyCases,
      cases: inspection.cases.map((entry) => ({
        id: entry.id,
        prospect: entry.prospect,
        group: entry.group,
        kind: entry.receipt.selected.kind,
        product: entry.receipt.product.name,
        fingerprint: entry.fingerprint,
        queries: entry.receipt.queries.map(({ query, executedAt }) => ({
          query,
          executedAt,
        })),
        originalDates: entry.receipt.sources.map(({ id, checkedAt }) => ({
          id,
          checkedAt,
        })),
        rawCaptureAvailable: entry.capture !== null,
        expected:
          entry.group === "historical-comparison"
            ? "ambiguous promotion: no proven mismatch"
            : "needs unbranded search: no absence claim",
      })),
      liveProviderCalls: 0,
      qualityVerdict:
        "Not run; injectable adapters are supplied by the later assessment, writer and gate steps.",
    },
    null,
    2,
  ),
);
