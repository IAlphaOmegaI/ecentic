import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { plugin } from "bun";
import { z } from "zod";

plugin({
  name: "outbound-held-third-review-operator",
  setup(builder) {
    builder.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    execute: { type: "boolean", default: false },
    actor: { type: "string", default: "outbound-email-rebuild-review" },
    steps: { type: "string", default: "1" },
    drain: { type: "boolean", default: false },
    instructions: { type: "string" },
    products: { type: "string" },
    corpus: { type: "string" },
  },
});
if (!values.instructions)
  throw new Error("Round 3 requires the exact authorized instruction file.");
const instructionHash = createHash("sha256")
  .update(await readFile(values.instructions, "utf8"))
  .digest("hex");
const steps = z.coerce.number().int().min(1).max(400).parse(values.steps);
const privateDirectory = resolve(
  import.meta.dir,
  "../../../../output/outbound-email-rebuild-2026-11-26/private",
);
const corpus = z
  .object({ heldProspects: z.array(z.string().uuid()).length(21) })
  .parse(
    JSON.parse(
      await readFile(
        values.corpus ??
          resolve(privateDirectory, "frozen-corpus.private.json"),
        "utf8",
      ),
    ),
  );
const selections = z
  .array(
    z.object({
      prospectId: z.string().uuid(),
      product: z.string().min(1),
      productUrl: z.string().url(),
      productCategory: z.string().min(1),
      evidence: z.record(z.string(), z.unknown()),
    }),
  )
  .length(4)
  .parse(
    JSON.parse(
      await readFile(
        values.products ??
          resolve(
            privateDirectory,
            "round3-product-selection/selected-products.json",
          ),
        "utf8",
      ),
    ),
  )
  .map((selection) => ({
    prospectId: selection.prospectId,
    product: { name: selection.product, url: selection.productUrl },
    category: selection.productCategory,
    evidence: selection.evidence,
  }));
const Contract = await import(
  "../../src/server/utils/outbound/held-review-contract"
);
const Third = await import(
  "../../src/server/utils/outbound/held-third-review-contract"
);
const Review = await import("../../src/server/app/outbound/held-third-review");
if (instructionHash !== Third.HELD_THIRD_REVIEW_INSTRUCTION_HASH)
  throw new Error(
    "The authorized round 3 instructions changed; reread and bind them before execution.",
  );
const manifest = Contract.heldReviewManifestSchema.parse({
  version: 1,
  prospectIds: corpus.heldProspects,
  approvedHoldReason: Contract.HELD_REVIEW_REASON,
});
const checked = await Review.inspect(manifest, instructionHash, selections);
if (!checked.success)
  throw new Error(`Round 3 preflight failed: ${checked.error.message}`);
console.log(
  JSON.stringify({
    mode: values.execute ? "execute" : "dry-run",
    ...checked.data,
  }),
);
if (!values.execute) process.exit(0);
const started = await Review.startThirdReview(
  values.actor,
  manifest,
  instructionHash,
  selections,
);
if (!started.success)
  throw new Error(`Round 3 initialization failed: ${started.error.message}`);
console.log(JSON.stringify({ mode: "staged", ...started.data }));
for (const _step of Array.from({ length: steps })) {
  const stopRequested = await access(
    resolve(privateDirectory, "round3-stop-between-runs"),
  ).then(
    () => true,
    () => false,
  );
  if (stopRequested) break;
  const progressed = await Review.runNext({
    controlId: started.data.controlId,
    deadline: Date.now() + 150_000,
  });
  if (!progressed.success)
    throw new Error(`Round 3 stage failed: ${progressed.error.message}`);
  console.log(JSON.stringify(progressed.data));
  if (!progressed.data.advanced) {
    if (!values.drain) break;
    const waiting = await Review.status(started.data.controlId);
    if (!waiting.success)
      throw new Error(`Round 3 status failed: ${waiting.error.message}`);
    console.log(JSON.stringify(waiting.data));
    if (
      waiting.data.paused ||
      (!waiting.data.counts.pending && !waiting.data.counts.running)
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 20_000));
  }
}
const summary = await Review.status(started.data.controlId);
if (!summary.success)
  throw new Error(`Round 3 status failed: ${summary.error.message}`);
console.log(JSON.stringify(summary.data));
