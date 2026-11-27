import { expect, test } from "bun:test";
import { resolve } from "node:path";

for (const scenario of [
  "normal",
  "expired",
  "replay-expired",
  "judgment-before-reservation",
  "judgment-future",
  "source-change",
  "provider-failure",
  "superseded",
])
  test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
    `scoped copy corrections preserve source rows and never repurchase: ${scenario}`,
    async () => {
      const execution = Bun.spawn(
        [
          process.execPath,
          "--no-env-file",
          resolve(
            import.meta.dir,
            "fixtures/outbound-held-third-fixed-result.fixture.ts",
          ),
          scenario,
        ],
        { env: { ...process.env }, stdout: "pipe", stderr: "pipe" },
      );
      const [status, output, error] = await Promise.all([
        execution.exited,
        new Response(execution.stdout).text(),
        new Response(execution.stderr).text(),
      ]);
      expect(error).toBe("");
      expect(status).toBe(0);
      expect(output).toContain(
        "Third fixed-result supplemental contracts passed",
      );
    },
    60000,
  );
