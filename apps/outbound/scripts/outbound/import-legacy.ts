import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { resultify } from "@zenncore/utils";
import { parseImport } from "../../src/server/app/outbound/import";
import { prepareLegacyImport } from "../../src/server/app/outbound/legacy";

const arguments_ = process.argv.slice(2);
const source = arguments_.includes("--source")
  ? arguments_[arguments_.indexOf("--source") + 1]
  : undefined;
if (!source || source.startsWith("--"))
  throw new Error("--source requires the legacy pipeline directory.");
const files = [
  "data/crm.csv",
  "data/do-not-contact.csv",
  "state/2026-W46/prospects.jsonl",
  "outbound/import/2026-W46-drafts.json",
];
const run = await resultify(async () => {
  const contents = await Promise.all(
    files.map((file) => readFile(resolve(source, file), "utf8")),
  );
  const [crm, exclusions, research, drafts] = contents.map(parseImport);
  if (!crm || !exclusions || !research || !drafts)
    throw new Error("All four legacy files are required.");
  const prepared = prepareLegacyImport({ crm, exclusions, research, drafts });
  const checksums = Object.fromEntries(
    files.map((file, index) => [
      file,
      createHash("sha256")
        .update(contents[index] ?? "")
        .digest("hex"),
    ]),
  );
  const allowQuarantine = arguments_.includes("--allow-quarantined-history");
  const reportPath = arguments_.includes("--quarantine-report")
    ? arguments_[arguments_.indexOf("--quarantine-report") + 1]
    : resolve(homedir(), ".codex/outbound-migration/2026-W46-quarantine.json");
  if (!reportPath)
    throw new Error("--quarantine-report requires an absolute path.");
  const report = {
    mode: arguments_.includes("--apply") ? "apply" : "dry-run",
    ...prepared.report,
    quarantineReport:
      prepared.report.errors.length && allowQuarantine ? reportPath : null,
    sourceChecksums: checksums,
  };
  if (allowQuarantine && prepared.report.errors.length) {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          source,
          sourceChecksums: checksums,
          unresolved: prepared.report.errors,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
  }
  console.info(
    JSON.stringify(
      {
        ...report,
        errors: report.errors.map(
          ({ rawIdentity: _private, ...error }) => error,
        ),
      },
      null,
      2,
    ),
  );
  if (!arguments_.includes("--apply")) return;
  if (arguments_.includes("--dry-run"))
    throw new Error("Choose either --apply or --dry-run.");
  if (
    prepared.report.errors.some((error) => error.source !== "crm") ||
    (prepared.report.errors.length && !allowQuarantine) ||
    prepared.report.drafts !== 13
  )
    throw new Error(
      "Resolve invalid rows or explicitly allow quarantined CRM identities, and confirm exactly 13 preserved drafts before applying.",
    );
  if (
    prepared.report.payloadRows > 5000 ||
    prepared.report.payloadBytes > 2_000_000
  )
    throw new Error("The normalized import exceeds the atomic batch bound.");
  // This process is a server CLI. Resolve only Next's marker as empty; global
  // react-server conditions also replace React and break next/navigation here.
  const { plugin } = await import("bun");
  plugin({
    name: "outbound-server-cli",
    setup(builder) {
      builder.module("server-only", () => ({ exports: {}, loader: "object" }));
    },
  });
  const Store = await import("../../src/server/app/outbound/store");
  const existing = await Store.getWorkspace();
  if (!existing.success) throw existing.error;
  if (
    existing.data.prospects.length ||
    existing.data.events.length ||
    existing.data.suppressions.length ||
    existing.data.inboxes.length ||
    existing.data.playbookRevision
  )
    throw new Error(
      "The one-time legacy import requires empty Outbound tables. Existing application data was not changed.",
    );
  const imported = await Store.importProspects("legacy-migration:2026-W46", {
    content: JSON.stringify(prepared.rows),
    freeze: true,
    ...(prepared.report.errors.length
      ? { quarantine: { count: prepared.report.errors.length, reportPath } }
      : {}),
  });
  if (!imported.success) throw imported.error;
  if (imported.data.invalid)
    throw new Error(
      "Unexpected invalid rows after normalization. Inspect the import result before proceeding.",
    );
  const after = await Promise.all(
    files.map((file) => readFile(resolve(source, file), "utf8")),
  );
  if (after.some((content, index) => content !== contents[index]))
    throw new Error(
      "A legacy source changed concurrently during import. Reconcile before enabling sending.",
    );
  console.info(
    JSON.stringify(
      {
        imported: imported.data,
        legacySourcesUnchanged: true,
        sendingEnabled: false,
        approvals: 0,
      },
      null,
      2,
    ),
  );
});
if (!run.success) {
  console.error(run.error.message);
  process.exitCode = 1;
}
