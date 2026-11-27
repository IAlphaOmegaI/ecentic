import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { plugin } from "bun";

if (process.env.TZ !== "UTC")
  throw new Error("Run this preparation repair with TZ=UTC.");
plugin({
  name: "held-third-query-preparation-repair",
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
    requests: { type: "string" },
  },
});
if (!values.instructions || !values.requests)
  throw new Error(
    "The exact third-review instruction file and four bound requests are required.",
  );
const instructionHash = createHash("sha256")
  .update(await readFile(values.instructions, "utf8"))
  .digest("hex");
const Contract = await import(
  "../../src/server/utils/outbound/held-third-query-repair-contract"
);
const Repair = await import(
  "../../src/server/app/outbound/held-third-query-repair"
);
const requests = Contract.queryPreparationRepairBatchRequestSchema.parse(
  JSON.parse(await readFile(values.requests, "utf8")),
);
if (requests.some((row) => row.instructionHash !== instructionHash))
  throw new Error(
    "The request batch differs from the exact authorized instruction.",
  );
const inspected = await Repair.inspectQueryPreparationRepairs(requests);
if (!inspected.success) throw inspected.error;
console.log(JSON.stringify({ mode: "dry-run", ...inspected.data }));
if (values.execute) {
  const repaired = await Repair.repairQueryPreparations(values.actor, requests);
  if (!repaired.success) throw repaired.error;
  console.log(JSON.stringify({ mode: "requeued", ...repaired.data }));
}
process.exit(0);
