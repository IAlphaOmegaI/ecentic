import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { plugin } from "bun";
import { z } from "zod";

plugin({
  name: "outbound-held-review-operator",
  setup(builder) {
    builder.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    execute: { type: "boolean", default: false },
    corpus: { type: "string" },
    actor: { type: "string", default: "held-review-operator" },
    steps: { type: "string", default: "1" },
    "repair-unspent": { type: "string" },
    "hold-unspent": { type: "string" },
    "reconcile-poll": { type: "string" },
    "reconcile-card-assessment": { type: "string" },
    reason: { type: "string" },
    "expected-query-hash": { type: "string" },
    "expected-shopping-job-id": { type: "string" },
    "expected-response-sha256": { type: "string" },
  },
});
const steps = z.coerce.number().int().min(1).max(50).parse(values.steps);
if (
  [
    values["repair-unspent"],
    values["hold-unspent"],
    values["reconcile-poll"],
    values["reconcile-card-assessment"],
  ].filter(Boolean).length > 1
)
  throw new Error("Choose only one explicit operator action.");
if (
  Boolean(values["repair-unspent"] || values["hold-unspent"]) !==
  Boolean(values["expected-query-hash"])
)
  throw new Error("An unspent-query action requires --expected-query-hash.");
if (Boolean(values["hold-unspent"]) !== Boolean(values.reason))
  throw new Error("Use --hold-unspent and --reason together.");
if (
  Boolean(values["reconcile-poll"] || values["reconcile-card-assessment"]) !==
    Boolean(values["expected-shopping-job-id"]) ||
  Boolean(values["reconcile-poll"] || values["reconcile-card-assessment"]) !==
    Boolean(values["expected-response-sha256"])
)
  throw new Error(
    "A saved-capture reconciliation requires --expected-shopping-job-id and --expected-response-sha256.",
  );
const corpusPath =
  values.corpus ??
  resolve(
    import.meta.dir,
    "../../../../output/outbound-email-rebuild-2026-11-26/private/frozen-corpus.private.json",
  );
const corpus = z
  .object({ heldProspects: z.array(z.string().uuid()).length(21) })
  .parse(JSON.parse(await readFile(corpusPath, "utf8")));
const Contract = await import(
  "../../src/server/utils/outbound/held-review-contract"
);
const Review = await import(
  "../../src/server/app/outbound/held-discovery-review"
);
const manifest = Contract.heldReviewManifestSchema.parse({
  version: 1,
  prospectIds: corpus.heldProspects,
  approvedHoldReason: Contract.HELD_REVIEW_REASON,
});
const checked = await Review.inspect(manifest);
if (!checked.success)
  throw new Error(
    `Held review preflight failed (${checked.error.name}). No provider step was started.`,
  );
console.log(
  JSON.stringify({
    mode: values.execute ? "execute" : "dry-run",
    ...checked.data,
  }),
);
if (values["repair-unspent"]) {
  const reconciled = await Review.repairUnspentQuery(values.actor, {
    manifest,
    jobId: z.string().uuid().parse(values["repair-unspent"]),
    expectedQueryHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(values["expected-query-hash"]),
    execute: values.execute,
  });
  if (!reconciled.success)
    throw new Error(
      `Unspent query reconciliation failed: ${reconciled.error.message}`,
    );
  console.log(
    JSON.stringify({
      mode: values.execute ? "repair-staged" : "repair-dry-run",
      ...reconciled.data,
    }),
  );
  // Arming the remaining repair is separate from running any provider stage.
  process.exit(0);
}
if (values["hold-unspent"]) {
  const held = await Review.holdUnspentQuery(values.actor, {
    manifest,
    jobId: z.string().uuid().parse(values["hold-unspent"]),
    expectedQueryHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(values["expected-query-hash"]),
    reason: z.string().trim().min(1).max(2000).parse(values.reason),
    execute: values.execute,
  });
  if (!held.success)
    throw new Error(`Unspent query hold failed: ${held.error.message}`);
  console.log(
    JSON.stringify({
      mode: values.execute ? "query-held" : "query-hold-dry-run",
      ...held.data,
    }),
  );
  process.exit(0);
}
if (values["reconcile-poll"]) {
  const restored = await Review.reconcileFailedPoll(values.actor, {
    manifest,
    jobId: z.string().uuid().parse(values["reconcile-poll"]),
    expectedShoppingJobId: z
      .string()
      .uuid()
      .parse(values["expected-shopping-job-id"]),
    expectedResponseSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(values["expected-response-sha256"]),
    execute: values.execute,
  });
  if (!restored.success)
    throw new Error(
      `Saved poll reconciliation failed: ${restored.error.message}`,
    );
  console.log(
    JSON.stringify({
      mode: values.execute ? "poll-reconciled" : "poll-reconciliation-dry-run",
      ...restored.data,
    }),
  );
  process.exit(0);
}
if (values["reconcile-card-assessment"]) {
  const restored = await Review.reconcileCardAssessment(values.actor, {
    manifest,
    jobId: z.string().uuid().parse(values["reconcile-card-assessment"]),
    expectedShoppingJobId: z
      .string()
      .uuid()
      .parse(values["expected-shopping-job-id"]),
    expectedResponseSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .parse(values["expected-response-sha256"]),
    execute: values.execute,
  });
  if (!restored.success)
    throw new Error(
      `Saved card-assessment reconciliation failed: ${restored.error.message}`,
    );
  console.log(
    JSON.stringify({
      mode: values.execute
        ? "card-assessment-reconciled"
        : "card-assessment-dry-run",
      ...restored.data,
    }),
  );
  process.exit(0);
}
if (values.execute) {
  if (
    checked.data.found !== 21 ||
    checked.data.exactHolds !== 21 ||
    checked.data.namedProducts !== 21
  )
    throw new Error(
      "The 21 approved contacts need their exact unsent holds and named products before execution.",
    );
  const started = await Review.start(values.actor, manifest);
  if (!started.success)
    throw new Error(`Held review start failed (${started.error.name}).`);
  for (let step = 0; step < steps; step += 1) {
    const advanced = await Review.runNext({ batchId: started.data.batchId });
    if (!advanced.success)
      throw new Error(
        `Held review checkpoint failed (${advanced.error.name}).`,
      );
    if (!advanced.data.advanced) break;
    console.log(
      JSON.stringify({
        stage: advanced.data.stage,
        status: advanced.data.status,
      }),
    );
  }
  const current = await Review.status(started.data.batchId);
  if (!current.success)
    throw new Error(`Held review status failed (${current.error.name}).`);
  console.log(
    JSON.stringify({
      batchId: current.data.batchId,
      queriesReserved: current.data.queriesReserved,
      maximumSubmissions: current.data.maximumSubmissions,
      paused: current.data.paused,
      counts: current.data.counts,
    }),
  );
}
process.exit(0);
