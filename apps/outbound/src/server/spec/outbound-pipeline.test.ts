import { expect, test } from "bun:test";
import { resolve } from "node:path";

test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
  "pipeline counts actual current campaign records and recorded outcomes",
  async () => {
    const execution = Bun.spawn(
      [
        process.execPath,
        "run",
        resolve(import.meta.dir, "fixtures/outbound-pipeline.fixture.ts"),
      ],
      { env: process.env, stdout: "pipe", stderr: "pipe" },
    );
    const [status, output, error] = await Promise.all([
      execution.exited,
      new Response(execution.stdout).text(),
      new Response(execution.stderr).text(),
    ]);
    expect(error).toBe("");
    expect(status).toBe(0);
    expect(output).toContain("Pipeline counts passed");
  },
  30000,
);
