import { parseArgs } from "node:util";
import { plugin } from "bun";

plugin({
  name: "hubspot-exclusions",
  setup(builder) {
    builder.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    action: { type: "string", default: "status" },
    execute: { type: "boolean", default: false },
    actor: { type: "string", default: "hubspot-exclusion-review" },
    request: { type: "string" },
    job: { type: "string" },
    hash: { type: "string" },
    "max-pages": { type: "string", default: "50" },
  },
});
const Sync = await import("../../src/server/app/outbound/hubspot-exclusions");
const result = await (async () => {
  switch (values.action) {
    case "status":
      return Sync.status();
    case "preview":
      if (!values.job) throw Error("--job is required.");
      return Sync.preview({ job: values.job });
    case "start":
      if (!values.execute || !values.request)
        throw Error(
          "Starting requires --execute and a unique --request UUID. No page is fetched yet.",
        );
      return Sync.start(values.actor, {
        requestId: values.request,
        maxPages: Number(values["max-pages"]),
      });
    case "page":
      if (!values.execute || !values.job)
        throw Error("One read page requires --execute and --job.");
      return Sync.runPage({ job: values.job });
    case "apply":
      if (!values.execute || !values.job || !values.hash)
        throw Error(
          "Applying reviewed exclusions requires --execute, --job and the exact preview --hash.",
        );
      return Sync.apply(values.actor, {
        job: values.job,
        expectedHash: values.hash,
      });
    case "enable":
      if (!values.execute || !values.job || !values.hash)
        throw Error(
          "Enabling daily protection requires --execute, --job and the exact applied preview --hash.",
        );
      return Sync.enable(values.actor, {
        job: values.job,
        expectedHash: values.hash,
      });
    case "disable":
      if (!values.execute)
        throw Error("Disabling daily protection requires --execute.");
      return Sync.disable(values.actor);
    default:
      throw Error(
        "Use status, preview, start, page, apply, enable or disable.",
      );
  }
})();
if (!result.success) throw result.error;
console.log(JSON.stringify(result.data, null, 2));
process.exit(0);
