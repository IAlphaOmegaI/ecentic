import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { plugin } from "bun";

if (process.env.TZ !== "UTC")
  throw new Error("Run this bound supplemental operator with TZ=UTC.");

plugin({
  name: "held-third-fixed-result-operator",
  setup(builder) {
    builder.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    execute: { type: "boolean", default: false },
    actor: { type: "string", default: "outbound-email-rebuild-review" },
    instructions: { type: "string" },
    source: { type: "string" },
    "row-hash": { type: "string" },
    "output-hash": { type: "string" },
    "candidate-hash": { type: "string" },
  },
});
if (!values.instructions)
  throw new Error(
    "The exact authorized round-three instruction file is required.",
  );
const instructionHash = createHash("sha256")
  .update(await readFile(values.instructions, "utf8"))
  .digest("hex");
const Contract = await import(
  "../../src/server/utils/outbound/held-third-fixed-result-contract"
);
const Recovery = await import(
  "../../src/server/app/outbound/held-third-fixed-result"
);
const request = Contract.fixedResultRequestSchema.parse({
  sourceJobId: values.source,
  instructionHash,
  expectedSourceRowHash: values["row-hash"],
  expectedOutputHash: values["output-hash"],
  expectedCandidatePartsHash: values["candidate-hash"],
});
const inspected = await Recovery.inspect(request);
if (!inspected.success) throw inspected.error;
console.log(
  JSON.stringify({
    mode: "dry-run",
    sourceBinding: inspected.data.sourceBinding,
    parts: inspected.data.parts,
    messages: inspected.data.messages,
    recoveryContextHash: inspected.data.recoveryContextHash,
    searchCalls: 0,
    writerCalls: 0,
    newJudgmentPasses: inspected.data.newJudgmentPasses,
  }),
);
if (values.execute) {
  const started = await Recovery.start(values.actor, request);
  if (!started.success) throw started.error;
  console.log(JSON.stringify({ mode: "staged", ...started.data }));
  const completed = await Recovery.run({
    jobId: started.data.jobId,
    deadline: Date.now() + 300000,
  });
  if (!completed.success) throw completed.error;
  console.log(JSON.stringify({ mode: "executed", ...completed.data }));
}
process.exit(0);
