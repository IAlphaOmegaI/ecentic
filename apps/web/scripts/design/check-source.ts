import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeSources,
  assetFile,
  checkAsset,
  consumersOf,
  type Finding,
  parseSource,
  type Registry,
  readProvenance,
  sourceInScope,
} from "./source";
import registryJson from "./source-registry.json";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const registry = registryJson as Registry;
const arguments_ = process.argv.slice(2);
const outputIndex = arguments_.indexOf("--out");
const output = outputIndex >= 0 ? arguments_[outputIndex + 1] : undefined;
const strict = arguments_.includes("--strict");
const help = arguments_.includes("--help");

const main = async () => {
  if (help) {
    console.log(
      "Usage: bun apps/web/scripts/design/check-source.ts [--strict] [--out report.json]\nRead-only C1/C4/C6 source checks. Findings are warnings/advisories by default; --strict fails on either. Parser and registry errors always fail.",
    );
    return;
  }
  const unknown = arguments_.filter(
    (argument, index) =>
      !["--strict", "--out"].includes(argument) &&
      !(outputIndex >= 0 && index === outputIndex + 1),
  );
  if (
    unknown.length ||
    (outputIndex >= 0 && (!output || output.startsWith("--")))
  )
    throw new Error("Invalid arguments. Use --help for usage.");
  const paths = Array.from(
    new Bun.Glob("**/*.{ts,tsx}").scanSync({
      cwd: resolve(root, registry.sourceRoot),
    }),
  )
    .map((path) => `${registry.sourceRoot}/${path}`)
    .sort();
  const sources = await Promise.all(
    paths.map(async (file) =>
      parseSource(file, await Bun.file(resolve(root, file)).text()),
    ),
  );
  const analysis = analyzeSources(sources, registry);
  const provenance = (
    await Promise.all(
      registry.artwork.provenance.map(async (file) =>
        readProvenance(file, await Bun.file(resolve(root, file)).json()),
      ),
    )
  ).flat();
  const activeAssets = [
    ...new Set(analysis.bindings.map((binding) => binding.asset)),
  ].sort();
  const activeProvenance = activeAssets.flatMap((asset) => {
    const record = provenance.find((entry) => entry.asset === asset);
    return record ? [record] : [];
  });
  const needed = [
    ...new Set(
      activeProvenance.flatMap((record) => [
        assetFile(record.source),
        assetFile(record.asset),
      ]),
    ),
  ];
  const files = new Map(
    (
      await Promise.all(
        needed.map(
          async (file): Promise<readonly [string, Uint8Array] | undefined> => {
            const handle = Bun.file(resolve(root, file));
            if (!(await handle.exists())) return undefined;
            return [file, new Uint8Array(await handle.arrayBuffer())];
          },
        ),
      )
    ).filter((entry): entry is readonly [string, Uint8Array] => !!entry),
  );
  const assetFindings = activeProvenance.flatMap((record) =>
    checkAsset(record, files).map((item) => ({
      ...item,
      consumerFiles: [
        ...new Set(
          analysis.bindings
            .filter((binding) => binding.asset === record.asset)
            .flatMap((binding) => [
              binding.source.file,
              ...consumersOf(binding.source.file, analysis.graph),
            ]),
        ),
      ].sort(),
    })),
  );
  const missing: Finding[] = analysis.bindings.flatMap((binding) => {
    if (provenance.some((record) => record.asset === binding.asset)) return [];
    const position = binding.source.tree.getLineAndCharacterOfPosition(
      binding.node.getStart(binding.source.tree),
    );
    return [
      {
        rule: "C4",
        check: "missing-artwork-provenance",
        severity: "warning",
        file: binding.source.file,
        line: position.line + 1,
        column: position.character + 1,
        message:
          "A public artwork binding has no registered clean source provenance.",
        evidence: [binding.asset],
        consumerFiles: consumersOf(binding.source.file, analysis.graph),
      },
    ];
  });
  const findings = [...analysis.findings, ...assetFindings, ...missing].sort(
    (first, second) =>
      first.file.localeCompare(second.file) ||
      first.line - second.line ||
      first.check.localeCompare(second.check),
  );
  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode: strict ? "strict" : "read-only-advisory",
    registry: "apps/web/scripts/design/source-registry.json",
    summary: {
      errors: findings.filter((item) => item.severity === "error").length,
      warnings: findings.filter((item) => item.severity === "warning").length,
      advisories: findings.filter((item) => item.severity === "advisory")
        .length,
      parsedFiles: sources.length,
      publicDiscoveryFiles: sources.filter((source) =>
        sourceInScope(source.file, registry),
      ).length,
      registeredScopes: analysis.coverage.length,
      notCheckedContracts: analysis.coverage
        .flatMap((entry) => entry.checks ?? [])
        .filter((check) => check.status === "not-checked").length,
      artworkBindings: analysis.bindings.length,
      activeAssets: activeAssets.length,
      provenanceRecords: provenance.length,
    },
    limitations: [
      "C1 and C6 are bounded source advisories; rendered geometry, content availability and visual quality need runtime review.",
      "C4 verifies registered provenance and active bindings; raster-source cleanliness, recognizable shape and preserved proportions require visual acceptance.",
      "Consumer files are transitive value-import reachability, not proof that every export renders on every route. Type-only imports are excluded.",
      "Syntax diagnostics cover parsed source files; this is not a TypeScript semantic typecheck.",
      "Typography, headings and canonical icon bindings are checked only for the visualContracts registry. Computed/inherited fonts, delegated renderers, icon subject meaning and alignment have explicit not-checked coverage; buttons and other component classes are not globally audited.",
    ],
    findings,
    coverage: analysis.coverage,
    assets: activeAssets.map((asset) => ({
      asset,
      provenance: provenance.find((record) => record.asset === asset) ?? null,
      bindings: analysis.bindings
        .filter((binding) => binding.asset === asset)
        .map((binding) => ({
          file: binding.source.file,
          line:
            binding.source.tree.getLineAndCharacterOfPosition(
              binding.node.getStart(binding.source.tree),
            ).line + 1,
        })),
      consumerFiles: [
        ...new Set(
          analysis.bindings
            .filter((binding) => binding.asset === asset)
            .flatMap((binding) =>
              consumersOf(binding.source.file, analysis.graph),
            ),
        ),
      ].sort(),
      visualAcceptance: "not-checked",
    })),
    renderers: registry.artwork.renderers.map((renderer) => ({
      ...renderer,
      consumerFiles: consumersOf(renderer.file, analysis.graph),
    })),
  };
  if (output) {
    const destination = resolve(process.cwd(), output);
    await mkdir(dirname(destination), { recursive: true });
    await Bun.write(destination, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(
    `Design source check: ${report.summary.warnings} warning(s), ${report.summary.advisories} advisory item(s), ${report.summary.errors} error(s).`,
  );
  console.log(
    `Parsed ${sources.length} files; discovered artwork in ${report.summary.publicDiscoveryFiles} public files; checked ${analysis.coverage.length} registered scopes and ${activeAssets.length} active assets.`,
  );
  for (const item of findings)
    console.log(
      `${item.severity.toUpperCase()} ${item.rule}/${item.check} ${item.file}:${item.line}:${item.column}\n  ${item.message}\n  ${item.evidence.join(" ")}`,
    );
  if (output) console.log(`JSON report: ${resolve(process.cwd(), output)}`);
  process.exitCode =
    report.summary.errors > 0 || (strict && findings.length > 0) ? 1 : 0;
};

await main().catch((error: unknown) => {
  console.error(
    `Design source check could not complete: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
