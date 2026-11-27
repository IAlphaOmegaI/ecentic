import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { resolve } from "node:path";
import { resultify } from "@zenncore/utils";
import {
  generateDrizzleJson,
  generateMigration,
} from "drizzle-kit/api-postgres";
import postgres from "postgres";
import { tables } from "../../src/server/database/schema";
import { requireTestDatabase } from "../../src/server/spec/helpers/database";

export const smokeSuites = [
  "src/server/spec/outbound-smoke-harness.test.ts",
  "src/server/spec/outbound-auth.test.ts",
  "src/server/spec/outbound-action-transport.test.ts",
  "src/server/spec/outbound-credential-actions.test.ts",
  "src/server/spec/outbound-credentials.test.ts",
  "src/server/spec/outbound-direct-mailbox.test.ts",
  "src/server/spec/outbound-direct-store.test.ts",
  "src/server/spec/outbound-smtp-failure.test.ts",
  "src/server/spec/outbound-mailbox-test.test.ts",
  "src/server/spec/outbound-domain.test.ts",
  "src/server/spec/outbound-capacity.test.ts",
  "src/server/spec/outbound-integration.test.ts",
  "src/server/spec/outbound-hubspot.test.ts",
  "src/server/spec/outbound-hubspot-exclusions.test.ts",
  "src/server/spec/outbound-hubspot-daily.test.ts",
  "src/server/spec/outbound-campaign-filter.test.ts",
  "src/server/spec/outbound-review.test.ts",
  "src/lib/spec/outbound-review-state.test.ts",
  "src/lib/spec/outbound-message-lint.test.ts",
  "src/lib/spec/outbound-conversation-editor.test.ts",
  "src/lib/spec/outbound-campaign-editor.test.ts",
  "src/lib/spec/outbound-review-editor.test.ts",
  "src/lib/spec/outbound-prospect-list.test.ts",
  "src/lib/spec/outbound-preparation.test.ts",
  "src/lib/spec/outbound-saved-contact.test.ts",
  "src/lib/spec/outbound-sequence-refresh.test.ts",
  "src/server/spec/outbound-store.test.ts",
  "src/server/spec/outbound-replacement-sequences.test.ts",
  "src/server/spec/outbound-inbox-activation.test.ts",
  "src/server/spec/outbound-worker-scheduling.test.ts",
  "src/server/spec/outbound-warmup-guard.test.ts",
  "src/server/spec/outbound-pipeline.test.ts",
  "src/server/spec/outbound-prospects.test.ts",
  "src/server/spec/outbound-page-reads.test.ts",
  "src/server/spec/outbound-campaigns.test.ts",
  "src/server/spec/outbound-automatic-discovery.test.ts",
  "src/server/spec/outbound-conversations.test.ts",
  "src/server/spec/outbound-automation-qualification.test.ts",
  "src/server/spec/outbound-product-collection.test.ts",
  "src/server/spec/outbound-firecrawl-cooldown.test.ts",
  "src/server/spec/outbound-scrapellm-cooldown.test.ts",
  "src/server/spec/outbound-live-shopping.test.ts",
  "src/server/spec/outbound-browser-product-identity.test.ts",
  "src/server/spec/outbound-shopping-response-identity.test.ts",
  "src/server/spec/outbound-qualification-catalog.test.ts",
  "src/server/spec/outbound-shopping-assessment.test.ts",
  "src/server/spec/outbound-shopping-research.test.ts",
  "src/server/spec/outbound-automation-recovery.test.ts",
  "src/server/spec/outbound-automation-store.test.ts",
  "src/server/spec/outbound-clay-automation.test.ts",
  "src/server/spec/outbound-sequence-refresh.test.ts",
  "src/server/spec/outbound-saved-contact-preparation.test.ts",
  "src/server/spec/outbound-saved-contact-location.test.ts",
  "src/server/spec/outbound-saved-contact-timezone.test.ts",
  "src/server/spec/outbound-shopping-facts.test.ts",
  "src/server/spec/outbound-discovery-review.test.ts",
  "src/server/spec/outbound-product-use.test.ts",
  "src/server/spec/outbound-shopping-answer-cards.test.ts",
  "src/server/spec/outbound-shopping-presence-entities.test.ts",
  "src/server/spec/outbound-shopping-presence-aliases.test.ts",
  "src/server/spec/outbound-card-writing.test.ts",
  "src/server/spec/outbound-shopping-fixture.test.ts",
  "src/server/spec/outbound-shopper-query-identity.test.ts",
  "src/server/spec/outbound-shopper-query-v2.test.ts",
  "src/server/spec/outbound-rebuild-policy.test.ts",
  "src/server/spec/outbound-writing-policy.test.ts",
  "src/server/spec/outbound-writing.test.ts",
  "src/server/spec/outbound-azure-draft.test.ts",
  "src/server/spec/outbound-controlled-draft.test.ts",
  "src/server/spec/outbound-compose-sequence.test.ts",
  "src/server/spec/outbound-composition.test.ts",
  "src/server/spec/outbound-copy-quality.test.ts",
  "src/server/spec/outbound-written-lint.test.ts",
  "src/server/spec/outbound-sequence-composition.test.ts",
  "src/server/spec/outbound-product-listing-absence.test.ts",
  "src/server/spec/outbound-reviewed-copy-rules.test.ts",
  "src/server/spec/outbound-copy-review-callers.test.ts",
  "src/server/spec/outbound-funnel.test.ts",
  "src/server/spec/outbound-held-discovery-review.test.ts",
  "src/server/spec/outbound-held-second-review.test.ts",
  "src/server/spec/outbound-held-brand-reconciliation.test.ts",
  "src/server/spec/outbound-round3-copy.test.ts",
  "src/server/spec/outbound-round3-query-research.test.ts",
  "src/server/spec/outbound-held-third-review.test.ts",
  "src/server/spec/outbound-held-third-query-repair.test.ts",
  "src/server/spec/outbound-held-third-query-basis.test.ts",
  "src/server/spec/outbound-held-third-fixed-result.test.ts",
  "src/server/spec/outbound-live-research-pipeline.test.ts",
  "src/server/spec/outbound-linkedin-automation.test.ts",
] as const;

export const smokeEnvironment = (
  endpoint: string,
  inherited: Partial<NodeJS.ProcessEnv>,
) => ({
  ...Object.fromEntries(
    ["PATH", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL"].flatMap((name) =>
      inherited[name] ? [[name, inherited[name]]] : [],
    ),
  ),
  PATH: inherited["PATH"] ?? "/usr/bin:/bin",
  NODE_ENV: "test",
  TZ: "UTC",
  APP_HOST: "http://localhost:3001",
  BETTER_AUTH_SECRET: "outbound-smoke-synthetic-auth-secret-only",
  CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(32, 19).toString("base64"),
  DATABASE_URL: requireTestDatabase(endpoint),
  OUTBOUND_TEST_DATABASE_URL: endpoint,
  OUTBOUND_SMOKE: "1",
  BUN_OPTIONS: `--no-env-file --preload=${resolve(import.meta.dir, "no-network.ts")}`,
});

export const readSmokeReport = (xml: string) => {
  const root = xml.match(/<testsuites\b[^>]*>/)?.[0];
  const attribute = (name: string) => {
    const match = root?.match(new RegExp(`\\b${name}="(\\d+)"`));
    return match ? Number(match[1]) : null;
  };
  const tests = attribute("tests");
  const failures = attribute("failures");
  const skipped = attribute("skipped");
  if (
    !root ||
    tests === null ||
    failures === null ||
    skipped === null ||
    tests < 1
  )
    throw new Error(
      "The suite did not produce a complete, nonempty JUnit report.",
    );
  return {
    tests,
    failures,
    skipped,
    valid:
      failures === 0 &&
      skipped === 0 &&
      !/<(?:skipped|failure|error)(?:\s|\/|>)/.test(xml),
  };
};

export const runSmoke = async (suites: readonly string[] = smokeSuites) => {
  if (
    !suites.length ||
    suites.some(
      (file) => !/^src\/(?:server|lib)\/spec\/[a-z0-9-]+\.test\.ts$/.test(file),
    )
  )
    throw new Error(
      "Choose one or more Outbound spec files for an isolated run.",
    );
  const app = resolve(import.meta.dir, "../..");
  const identifier = randomBytes(6).toString("hex");
  const name = `outbound_smoke_${identifier}`;
  const endpoint = new URL(`postgres://127.0.0.1:55432/${name}`);
  endpoint.username =
    process.env["OUTBOUND_SMOKE_PG_USER"] || userInfo().username;
  endpoint.password = process.env["OUTBOUND_SMOKE_PG_PASSWORD"] || "";
  requireTestDatabase(endpoint.href);
  const administrator = new URL(endpoint);
  administrator.pathname = "/postgres";
  const admin = postgres(administrator.href, {
    max: 1,
    connect_timeout: 3,
    idle_timeout: 1,
    onnotice: () => undefined,
  });
  const database = postgres(endpoint.href, {
    max: 1,
    connect_timeout: 3,
    idle_timeout: 1,
    onnotice: () => undefined,
  });
  const directory = resolve(
    app,
    "../../output/outbound-smoke",
    `${new Date().toISOString().replaceAll(":", "-")}-${identifier}`,
  );
  const state = { created: false };
  const results: {
    file: string;
    tests: number;
    failures: number;
    skipped: number;
    passed: boolean;
    milliseconds: number;
  }[] = [];
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const outcome = await resultify(async () => {
    console.log(
      "Outbound smoke: isolated PostgreSQL + offline provider fixtures.",
    );
    const connected = await resultify(() => admin`select 1`);
    if (!connected.success)
      throw new Error(
        "Start disposable PostgreSQL on 127.0.0.1:55432 before running smoke tests. See apps/outbound/README.md. No database tests were skipped.",
      );
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    state.created = true;
    const empty = await generateDrizzleJson({});
    const current = await generateDrizzleJson(tables);
    const statements = await generateMigration(empty, current);
    for (const statement of statements) await database.unsafe(statement);
    await database.end();
    const environment = smokeEnvironment(endpoint.href, process.env);
    for (const file of suites) {
      const started = Date.now();
      const report = resolve(directory, `${file.split("/").at(-1)}.xml`);
      const execution = Bun.spawn(
        [
          process.execPath,
          "--no-env-file",
          "test",
          "--timeout=15000",
          "--reporter=junit",
          `--reporter-outfile=${report}`,
          `./${file}`,
        ],
        {
          cwd: app,
          env: environment,
          stdout: "pipe",
          stderr: "pipe",
        },
      );
      const timer = setTimeout(() => execution.kill(), 120000);
      const [status, output, error] = await Promise.all([
        execution.exited,
        new Response(execution.stdout).text(),
        new Response(execution.stderr).text(),
      ]);
      clearTimeout(timer);
      const parsed = await resultify(async () =>
        readSmokeReport(await readFile(report, "utf8")),
      );
      const result = {
        file,
        tests: parsed.success ? parsed.data.tests : 0,
        failures: parsed.success ? parsed.data.failures : 1,
        skipped: parsed.success ? parsed.data.skipped : 0,
        passed: status === 0 && parsed.success && parsed.data.valid,
        milliseconds: Date.now() - started,
      };
      results.push(result);
      await writeFile(
        resolve(directory, `${file.split("/").at(-1)}.log`),
        `${output}\n${error}`,
        { mode: 0o600 },
      );
      console.log(
        `${result.passed ? "PASS" : "FAIL"} ${file} (${result.tests} tests, ${result.skipped} skipped)`,
      );
      if (!result.passed)
        console.error(
          (
            error ||
            output ||
            (parsed.success
              ? "A skipped test is a smoke failure."
              : parsed.error.message)
          ).slice(-16000),
        );
    }
  });
  const cleanup = await resultify(async () => {
    await database.end({ timeout: 1 });
    if (state.created)
      await admin.unsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.end({ timeout: 1 });
  });
  const passed =
    outcome.success &&
    cleanup.success &&
    results.length === suites.length &&
    results.every((result) => result.passed);
  await writeFile(
    resolve(directory, "summary.json"),
    JSON.stringify(
      {
        passed,
        database: name,
        databaseRemoved: state.created && cleanup.success,
        results,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    `Smoke ${passed ? "passed" : "failed"}: ${results.reduce((total, result) => total + result.tests, 0)} tests. Reports: ${directory}`,
  );
  if (!outcome.success) console.error(outcome.error.message);
  if (!cleanup.success)
    console.error(`Could not remove disposable database ${name}.`);
  return passed ? 0 : 1;
};

if (import.meta.main) {
  const requested = process.argv.slice(2);
  process.exitCode = await runSmoke(requested.length ? requested : smokeSuites);
}
