import { expect, test } from "bun:test";
import { resolve } from "node:path";

for (const scenario of [
  "pass",
  "query-progress",
  "rejected",
  "interrupted",
  "source-tamper",
  "audit-tamper",
  "replay-expiry",
])
  test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
    `Good American basis review remains once-only and source-bound: ${scenario}`,
    async () => {
      const execution = Bun.spawn(
        [
          process.execPath,
          "--no-env-file",
          resolve(
            import.meta.dir,
            "fixtures/outbound-held-third-query-basis.fixture.ts",
          ),
          scenario,
        ],
        { env: { ...process.env, TZ: "UTC" }, stdout: "pipe", stderr: "pipe" },
      );
      const [status, output, error] = await Promise.all([
        execution.exited,
        new Response(execution.stdout).text(),
        new Response(execution.stderr).text(),
      ]);
      expect(error).toBe("");
      expect(status).toBe(0);
      expect(output).toContain(
        "Good American one-use basis review contracts passed",
      );
    },
    90000,
  );
