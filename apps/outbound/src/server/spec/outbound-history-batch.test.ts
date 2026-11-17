import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test.skipIf(!process.env.OUTBOUND_TEST_DATABASE_URL)(
  "bounded history batches retain receipts, outcomes and fenced checkpoints",
  () => {
    const result = spawnSync(
      process.execPath,
      ["run", "src/server/spec/fixtures/outbound-history-batch.fixture.ts"],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: "utf8",
        timeout: 30_000,
      },
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("History batch checks passed");
  },
  35_000,
);
