import { expect, test } from "bun:test";
import { resolve } from "node:path";

test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
  "funnel counts observed outcomes and distinct purchases without targets or invented delivery",
  async () => {
    const execution = Bun.spawn(
      [
        process.execPath,
        "--no-env-file",
        resolve(import.meta.dir, "fixtures/outbound-funnel.fixture.ts"),
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
    expect(output).toContain("Measured funnel contracts passed");
  },
  30000,
);
