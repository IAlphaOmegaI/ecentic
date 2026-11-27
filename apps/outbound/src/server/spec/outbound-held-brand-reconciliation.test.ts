import { expect, test } from "bun:test";
import { resolve } from "node:path";

test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
  "explicit saved-answer brands preserve the failed output and only stage an unapplied receipt",
  async () => {
    const execution = Bun.spawn(
      [
        process.execPath,
        "--no-env-file",
        resolve(
          import.meta.dir,
          "fixtures/outbound-held-brand-reconciliation.fixture.ts",
        ),
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
    expect(output).toContain("Explicit brand reconciliation contracts passed");
  },
  30000,
);
