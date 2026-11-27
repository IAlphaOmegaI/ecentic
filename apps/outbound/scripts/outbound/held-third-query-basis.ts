import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { plugin } from "bun";

if (process.env.TZ !== "UTC")
  throw new Error("Run this one-use basis review with TZ=UTC.");
plugin({
  name: "held-third-query-basis-review",
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
    request: { type: "string" },
  },
});
if (!values.instructions || !values.request)
  throw new Error(
    "The exact instruction file and bound Good American request are required.",
  );
const hash = createHash("sha256")
  .update(await readFile(values.instructions, "utf8"))
  .digest("hex");
const Contract = await import(
  "../../src/server/utils/outbound/held-third-query-basis-contract"
);
const Review = await import(
  "../../src/server/app/outbound/held-third-query-basis"
);
const request = Contract.queryBasisReviewRequestSchema.parse(
  JSON.parse(await readFile(values.request, "utf8")),
);
if (request.instructionHash !== hash)
  throw new Error("The request differs from the exact authorized instruction.");
const checked = await Review.inspectQueryBasisReview(request);
if (!checked.success) throw checked.error;
console.log(JSON.stringify({ mode: "dry-run", ...checked.data }));
if (values.execute) {
  const reviewed = await Review.runQueryBasisReview(values.actor, request, {
    deadline: Date.now() + 300000,
  });
  if (!reviewed.success) throw reviewed.error;
  console.log(JSON.stringify({ mode: "one-use-review", ...reviewed.data }));
}
process.exit(0);
