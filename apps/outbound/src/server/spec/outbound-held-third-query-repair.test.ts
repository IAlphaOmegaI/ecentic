import { expect, test } from "bun:test";
import { resolve } from "node:path";

for (const scenario of [
  "normal",
  "progress",
  "rejected-review",
  "semantic-uncertain",
])
  test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
    `exact-four preparation repair is atomic and preserves research: ${scenario}`,
    async () => {
      const execution = Bun.spawn(
        [
          process.execPath,
          "--no-env-file",
          resolve(
            import.meta.dir,
            "fixtures/outbound-held-third-query-repair.fixture.ts",
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
        "Third exact-four query preparation repair contracts passed",
      );
    },
    90000,
  );
